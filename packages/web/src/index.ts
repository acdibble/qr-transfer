import { Event, emitPromisified } from 'common';
import { io, type Socket } from 'socket.io-client';
import QRCode from 'qrcode';

async function* iterateFile(file: File) {
  const reader = (file.stream() as unknown as ReadableStream).getReader();

  let current;
  for (current = await reader.read(); !current.done; current = await reader.read()) {
    yield current.value;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;

  io('/', { autoConnect: false })
    .on(Event.QRCode, ({ url }: { url: string }) => {
      document.getElementById('qr-url')!.innerText = url;
      QRCode.toCanvas(document.getElementById('qr-code')!, url, { scale: 10 }, (err) => {
        if (err) console.error(err);
      });
    })
    .on(Event.FileRequest, async function (this: Socket) {
      const file = fileInput.files?.[0];
      if (file) {
        for await (const chunk of iterateFile(file)) {
          await emitPromisified(this, Event.FileChunk, chunk);
        }

        fileInput.value = '';
      }

      this.emit(Event.FileEnd);
    })
    .connect();

  fileInput.value = '';
});
