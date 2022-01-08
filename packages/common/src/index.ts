import type { Socket } from 'socket.io-client';

export const enum Event {
  FileChunk = 'file:chunk',
  FileRequest = 'file:request',
  QRCode = 'qr-code',
}

export const emitPromisified = (
  socket: Socket,
  event: string,
  ...data: any[]
): Promise<any[]> =>
  new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, ...data, (err: any, ...rest: any[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rest);
      }
    });
  });
