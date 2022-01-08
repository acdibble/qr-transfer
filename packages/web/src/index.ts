import { Event, emitPromisified } from 'common';
import { io, type Socket } from 'socket.io-client';
import QRCode from 'qrcode';

async function* iterateFile(file: File) {
  const reader = (file.stream() as unknown as ReadableStream).getReader();

  let current;
  for (
    current = await reader.read();
    !current.done;
    current = await reader.read()
  ) {
    yield current.value;
  }
}

let file: File | undefined;

document.addEventListener('DOMContentLoaded', () => {
  io('/', { autoConnect: false })
    .on(Event.QRCode, ({ url }: { url: string }) => {
      document.getElementById('qr-url')!.innerText = url;
      QRCode.toCanvas(
        document.getElementById('qr-code')!,
        url,
        { scale: 10 },
        (err) => {
          if (err) console.error(err);
        }
      );
    })
    .on(Event.FileRequest, async function (this: Socket) {
      if (!file) return;
      for await (const chunk of iterateFile(file)) {
        console.log(chunk);
        await emitPromisified(this, Event.FileChunk, chunk);
      }

      await emitPromisified(this, Event.FileChunk, null);
    })
    .connect();
});

document
  .getElementById('file-input')
  ?.addEventListener('change', function (this: HTMLInputElement) {
    file = this.files?.[0];
  });
