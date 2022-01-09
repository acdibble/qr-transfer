import { createSocket } from 'common';
import QRCode from 'qrcode';
import './style.css';

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
  const qrCodeDiv = document.getElementById('qr-url') as HTMLInputElement;
  let downloadURL: string | undefined;

  copyButton.addEventListener('click', async () => {
    if (downloadURL) {
      await navigator.clipboard.writeText(downloadURL);
    }
  });

  fileInput.value = '';

  const onQRCode = (url: string) => {
    downloadURL = url;
    const uuid = url.split('/').at(-1) as string;
    qrCodeDiv.value = uuid;
    QRCode.toCanvas(document.getElementById('qr-code')!, url, { width: 500 }, (err) => {
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
