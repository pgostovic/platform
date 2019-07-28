import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import http from 'http';
import Koa from 'koa';
import koaWebpack from 'koa-webpack';
import path from 'path';
import { webpackConfig } from '../etc/webpack';

dotenv.config();

const koaApp = new Koa();

(async () => {
  koaApp.use(await koaWebpack({ config: webpackConfig }));

  const html = (await fs.readFile(
    path.resolve(__dirname, 'index.html'),
  )).toString();

  koaApp.use(async ctx => {
    ctx.body = html;
  });
})();

const httpServer = http.createServer(koaApp.callback());
httpServer.listen(process.env.PORT);
console.log('Server started on port %d', process.env.PORT);
