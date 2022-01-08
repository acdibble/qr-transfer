import * as fs from 'fs';
import { emitPromisified, Event } from 'common';
import { QR_CODE_SERVER_URL } from 'common/dist/constants.js';
import QRCode, { QRCodeOptions } from 'qrcode';
import { io, Socket } from 'socket.io-client';

const [, , file] = process.argv;

if (!file) {
  console.error('Usage:');
  console.error('qr-transfer <path>');
  process.exit(64);
}

const printCode = async (url: string) => {
  const code = await QRCode.toString(url, {
    type: 'terminal',
    small: true,
  } as QRCodeOptions);
  console.log(code);
  console.log(url);
};

io(QR_CODE_SERVER_URL, { autoConnect: false })
  .on(Event.QRCode, ({ url }: { url: string }) => {
    printCode(url).catch(console.error);
  })
  // eslint-disable-next-line func-names
  .on(Event.FileRequest, async function (this: Socket) {
    for await (const chunk of fs.createReadStream(file)) {
      await emitPromisified(this, Event.FileChunk, chunk);
    }
    await emitPromisified(this, Event.FileChunk, null);
    process.exit(0);
  })
  .connect();
