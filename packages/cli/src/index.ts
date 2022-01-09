import * as fs from 'fs';
import { createSocket, type Metadata } from 'common';
import { QR_CODE_SERVER_URL } from 'common/dist/constants.js';
import QRCode, { QRCodeOptions } from 'qrcode';
import mime from 'mime-types';

const [, , file] = process.argv;

if (!file) {
  console.error('Usage:');
  console.error('qr-transfer <path>');
  process.exit(64);
}

const onQRCode = (url: string) => {
  QRCode.toString(url, {
    type: 'terminal',
    small: true,
  } as QRCodeOptions).then((code) => {
    console.log(code);
    console.log(url);
  }, console.error);
};

const getMetadata = (): Metadata => {
  const type = mime.lookup(file);
  return { mimeType: type || null };
};

createSocket({
  onQRCode,
  getMetadata,
  url: QR_CODE_SERVER_URL,
  afterRequest: () => process.exit(0),
  getStream: () => fs.createReadStream(file)[Symbol.asyncIterator](),
});
