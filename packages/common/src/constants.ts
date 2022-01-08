import os from 'os';

const interfaces = os.networkInterfaces().en0;

const address = interfaces?.find(({ family }) => family === 'IPv4')?.address;

export const QR_CODE_SERVER_PORT = process.env.QR_CODE_SERVER_PORT ?? '1313';
export const QR_CODE_SERVER_URL =
  process.env.QR_CODE_SERVER_URL ?? `http://${address}:${QR_CODE_SERVER_PORT}`;
