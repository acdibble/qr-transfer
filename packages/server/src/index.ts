import http from 'http';
import express from 'express';
import { Event } from 'common';
import { Server, type Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { QR_CODE_SERVER_URL } from 'common/dist/constants.js';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { on, once } from 'events';
import Cache from './Cache.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const idMap = new Cache<string, Socket>();

const prepareSocket = async (socket: Socket) => {
  let uuid: string;

  do {
    uuid = randomUUID();
  } while (idMap.has(uuid));

  try {
    idMap.set(uuid, socket);

    socket.emit(Event.QRCode, {
      url: new URL(`/files/${uuid}`, QR_CODE_SERVER_URL).toString(),
    });

    socket.once('disconnect', () => {
      idMap.delete(uuid);
    });
  } catch (err) {
    idMap.delete(uuid);
  }
};

const timeout = (ms: number): Promise<never> =>
  new Promise((resolve, reject) => {
    setTimeout(reject, ms, Error('timeout'));
  });

async function* getFileChunks(socket: Socket) {
  const chunksIt = on(socket, Event.FileChunk);
  const fileEnd = once(socket, Event.FileEnd).then(() => null);

  while (true) {
    const result = await Promise.race([chunksIt.next(), fileEnd, timeout(5000)]);

    if (result === null) return;
    const [chunk, next] = result.value;
    yield chunk;
    next(null);
  }
}

const app = express()
  .get('/files/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const socket = idMap.pop(uuid);

    if (!socket) {
      res.sendStatus(404);
      return;
    }

    try {
      const it = getFileChunks(socket);
      socket.emit(Event.FileRequest);

      const { value: firstChunk, done } = await it.next();

      if (done) {
        res.status(400).send('No data received from client\n');
      } else {
        res.setHeader('content-encoding', 'gzip');
        const gzip = createGzip();
        gzip.write(firstChunk);
        await pipeline(it, gzip, res);
      }
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.sendStatus(500);
      } else if (!res.writableEnded) {
        res.end();
      }
    } finally {
      idMap.delete(uuid);
      await prepareSocket(socket);
    }
  })
  .use('/static', express.static(path.join(dirname, '..', '..', 'web', 'dist')))
  .use('/', express.static(path.join(dirname, '..', '..', 'web', 'dist')));

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', prepareSocket);

server.listen(Number.parseInt(process.env.QR_SERVER_PORT as string, 10) || 1313);
