import * as Koa from 'koa'
import {
  RouteWithHandler,
  runRouteWithHandler,
} from './Handler'
import * as E from 'fp-ts/Either'

import { pipe } from 'fp-ts/lib/function'
import * as NE from 'fp-ts/NonEmptyArray'
import * as A from 'fp-ts/Array'
import * as TE from 'fp-ts/TaskEither'

// we can accept a NonEmptyArray instead
const neAltMany = <E, A>(
  as: NE.NonEmptyArray<TE.TaskEither<E, A>>
): TE.TaskEither<E, A> => {
  const a = NE.head(as) // this will be always be a value
  const rest = NE.tail(as) // this will be an array (that may be empty)

  // we try each ReaderTaskEither in turn
  return rest.reduce(
    (all, val) =>
      pipe(
        all,
        TE.alt(() => val)
      ),
    a
  )
}

type AnyRouteWithHandler = RouteWithHandler<
  any,
  any,
  any,
  any,
  any
>

export const router = (
  routeHandler: AnyRouteWithHandler,
  ...routeHandlers: AnyRouteWithHandler[]
) => async (
  ctx: Koa.Context,
  _next: () => Promise<unknown>
) => {
  const url = ctx.request.url
  const method = ctx.request.method
  const rawHeaders = ctx.request.headers
  const rawData = (ctx.request as any).body

  const tryAllRoutes = pipe(
    // all route handlers but the first
    routeHandlers,
    // create NE array of handlers by prepending the first one
    A.prepend(routeHandler),
    // pass each one the route info
    NE.map(routeHandler =>
      runRouteWithHandler(routeHandler)({
        url,
        method,
        rawData,
        rawHeaders,
      })
    ),
    // run each one in turn till one matches
    neAltMany
  )

  const result = await tryAllRoutes()

  if (E.isRight(result)) {
    ctx.response.status = result.right.code
    ctx.response.body = result.right.data

    return
  } else {
    if (result.left.type === 'ValidationError') {
      ctx.response.status = 400
      ctx.response.body = result.left.message
      return
    }
  }
}
