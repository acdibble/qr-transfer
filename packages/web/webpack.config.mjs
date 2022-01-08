/* eslint-disable */
// @ts-nocheck
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('webpack').Configuration} */
export default {
  entry: path.resolve(dirname, 'src', 'index.ts'),
  output: {
    path: path.resolve(dirname, 'dist'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?/,
        use: {
          loader: 'ts-loader',
          options: {
            projectReferences: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(dirname, 'src', 'index.html'),
      publicPath: '/static',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
