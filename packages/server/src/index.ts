import http from 'http';
import { on } from 'events';
import express from 'express';
import { Event } from 'common';
import { Server, type Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { QR_CODE_SERVER_URL } from 'common/dist/constants.js';
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

const app = express()
  .get('/files/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const socket = idMap.pop(uuid);

    if (!socket) {
      res.sendStatus(404);
      return;
    }

    try {
      const iterable = on(socket, Event.FileChunk);
      socket.emit(Event.FileRequest);

      for await (const [chunk, ack] of iterable) {
        if (chunk === null) {
          ack(null);
          break;
        }

        res.write(chunk);
        ack(null);
      }

      if (res.headersSent) {
        res.end();
      } else {
        res.status(400).send('No data received from client');
      }

      await prepareSocket(socket);
    } catch {
      // todo
      res.sendStatus(500);
    } finally {
      idMap.delete(uuid);
    }
  })
  .use('/static', express.static(path.join(dirname, '..', '..', 'web', 'dist')))
  .use('/', express.static(path.join(dirname, '..', '..', 'web', 'dist')));

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', prepareSocket);

server.listen(
  Number.parseInt(process.env.QR_SERVER_PORT as string, 10) || 1313
);
