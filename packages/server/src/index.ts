import http from 'http';
import express from 'express';
import { Event, Metadata } from 'common';
import { Server, type Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { QR_CODE_SERVER_URL } from 'common/dist/constants.js';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { on, once } from 'events';
import cookieParser from 'cookie-parser';
import Cache from './Cache.js';

type AcknowledgementMessage<T> = [T, (error: Error | null) => void];

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

const onceWithAcknowledgement = async <T>(socket: Socket, event: Event): Promise<T> => {
  const promise = once(socket.timeout(5000), event);
  const [payload, ack] = (await promise) as AcknowledgementMessage<T>;
  ack(null);
  return payload;
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
  .use(cookieParser())
  .get('/files/:uuid', async (req, res) => {
    const { uuid } = req.params;

    const { resource } = req.cookies ?? {};
    if (resource !== uuid) {
      res.setHeader('set-cookie', `resource=${uuid}`);
      const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);
      res.setHeader('location', url.toString());
      res.sendStatus(302);
      return;
    }

    const socket = idMap.pop(uuid);

    if (!socket) {
      res.sendStatus(404);
      return;
    }

    try {
      const metadataPromise = onceWithAcknowledgement<Metadata>(socket, Event.FileMetadata);
      socket.emit(Event.FileRequest);
      const it = getFileChunks(socket);

      const { mimeType } = await metadataPromise;

      const { value: firstChunk, done } = await it.next();

      if (done) {
        res.status(400).send('No data received from client\n');
      } else {
        res.setHeader('content-type', mimeType ?? 'application/octet-stream');
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
