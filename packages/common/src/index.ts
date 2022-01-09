import { io, type Socket } from 'socket.io-client';

export const enum Event {
  FileChunk = 'file:chunk',
  FileEnd = 'file:end',
  FileRequest = 'file:request',
  QRCode = 'qr-code',
}

export const emitPromisified = (socket: Socket, event: string, ...data: any[]): Promise<any[]> =>
  new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, ...data, (err: any, ...rest: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rest);
      }
    });
  });

interface Options {
  url: string;
  onQRCode: (url: string) => void;
  afterRequest: () => void;
  getStream: () => AsyncIterableIterator<any>;
}

export const createSocket = ({ url, onQRCode, afterRequest, getStream }: Options) =>
  io(url, { autoConnect: false })
    .on(Event.QRCode, ({ url: fileURL }: { url: string }) => onQRCode(fileURL))
    .on(Event.FileRequest, async function (this: Socket) {
      for await (const chunk of getStream()) {
        await emitPromisified(this, Event.FileChunk, chunk);
      }
      this.emit(Event.FileEnd);
      afterRequest();
    })
    .connect();
