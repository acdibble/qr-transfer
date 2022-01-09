/* eslint-disable */
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import { fileURLToPath } from 'url';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

// @ts-ignore
const dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(dirname, 'src');

/** @type {import('webpack').Configuration} */
export default {
  entry: path.resolve(srcDir, 'index.ts'),
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
      {
        test: /\.css$/i,
        include: path.join(srcDir),
        use: [{ loader: MiniCssExtractPlugin.loader }, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(srcDir, 'index.html'),
      publicPath: '/static',
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
      ignoreOrder: false,
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
