// tslint:disable: object-literal-sort-keys
import path from 'path';
import { Configuration } from 'webpack';

export const webpackConfig = {
  mode: 'development',
  target: 'web',
  entry: [path.resolve(__dirname, '../src/index.tsx')],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        loader: 'raw-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, '../dist'),
    publicPath: '/',
  },
} as Configuration;
