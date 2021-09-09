import * as Koa from 'koa';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import * as NE from 'fp-ts/NonEmptyArray';
import * as A from 'fp-ts/Array';
import * as TE from 'fp-ts/TaskEither';

import { runRouteWithHandler } from './runRoute';
import { RouteWithHandler } from './Handler';

// we can accept a NonEmptyArray instead
const neAltMany = <E, A>(
  as: NE.NonEmptyArray<TE.TaskEither<E, A>>,
): TE.TaskEither<E, A> => {
  const a = NE.head(as); // this will be always be a value
  const rest = NE.tail(as); // this will be an array (that may be empty)

  // we try each ReaderTaskEither in turn
  // if we get a 'NoMatchError' we try another, if not, we return the error
  const x = rest.reduce(
    (all, val) =>
      pipe(
        all,
        TE.alt(() => val),
      ),
    a,
  );

  return x;
};

type AnyRouteWithHandler = RouteWithHandler<any, any, any, any, any, any>;

export const serveRoutes =
  (
    routeHandler: AnyRouteWithHandler,
    ...routeHandlers: AnyRouteWithHandler[]
  ) =>
  async (ctx: Koa.Context, _next: () => Promise<unknown>) => {
    const { url } = ctx.request;
    const { method } = ctx.request;
    const rawHeaders = ctx.request.headers;
    const rawData = (ctx.request as any).body;

    const tryAllRoutes = pipe(
      // all route handlers but the first
      routeHandlers,
      // create NE array of handlers by prepending the first one
      A.prepend(routeHandler),
      // pass each one the route info
      NE.map((routeHandler) =>
        runRouteWithHandler(routeHandler)({
          url,
          method,
          rawData,
          rawHeaders,
        }),
      ),
      // run each one in turn till one matches
      neAltMany,
    );

    const result = await tryAllRoutes();

    // success is either a real result or matched route that then errored
    if (E.isRight(result)) {
      // we hit a route but it errored...
      if (E.isLeft(result.right)) {
        if (result.right.left.type === 'ValidationError') {
          ctx.response.status = 400;
          ctx.response.body = `${
            result.right.left.which
          }: ${result.right.left.message.join('\n')}`;
          return;
        }

        ctx.response.status = 500;
        ctx.response.body = 'Route has no response validator'; // TODO - make this never happen by forcing return type validator in construction of Route
        return;
      }
      // we hit a route and it succeeded
      ctx.response.status = result.right.right.code;
      ctx.response.body = result.right.right.data;

      return;
    }

    ctx.response.status = 404;
    ctx.response.body = 'Not Found';
  };
