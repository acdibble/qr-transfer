import { createSocket } from 'common';
import QRCode from 'qrcode';

async function* iterateFile(file: File) {
  const reader = (file.stream() as unknown as ReadableStream).getReader();

  let current;
  for (current = await reader.read(); !current.done; current = await reader.read()) {
    yield current.value;
  }
}

async function* noopStream() {
  // noop
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const copyButton = document.getElementById('copy-button') as HTMLButtonElement;
  const qrCodeDiv = document.getElementById('qr-url') as HTMLDivElement;

  copyButton.addEventListener('click', async () => {
    await navigator.clipboard.writeText(qrCodeDiv.innerText);
  });

  fileInput.value = '';

  const onQRCode = (url: string) => {
    qrCodeDiv.innerText = url;
    QRCode.toCanvas(document.getElementById('qr-code')!, url, { scale: 10 }, (err) => {
      if (err) console.error(err);
    });
  };

  createSocket({
    url: '/',
    onQRCode,
    afterRequest: () => {
      fileInput.value = '';
    },
    getStream: () => {
      const file = fileInput.files?.[0];
      return file ? iterateFile(file) : noopStream();
    },
  });
});
