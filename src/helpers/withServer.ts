import * as Koa from 'koa';
import { Server } from 'http';
import bodyParser from 'koa-bodyparser';

export const withServer = async (
  router: Koa.Middleware,
  fn: (server: Server) => Promise<unknown>,
) => {
  // eslint-disable-next-line new-cap
  const app = new Koa.default();

  app.use(bodyParser());
  app.use(router);

  // rando port between 3000 and 8000
  const PORT = Math.floor(Math.random() * 3000) + 5000;

  const server = app.listen(PORT);

  try {
    await fn(server);
  } finally {
    server.close();
  }
};
