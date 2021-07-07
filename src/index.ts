import * as Koa from 'koa'
import {
  RouteWithHandler,
  runRouteWithHandler,
} from './Handler'
import * as E from 'fp-ts/Either'
import { MatchError } from './MatchError'
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
  // if we get a 'NoMatchError' we try another, if not, we return the error
  const x = rest.reduce(
    (all, val) =>
      pipe(
        all,
        TE.alt(() => val)
      ),
    a
  )

  return x
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

  // success is either a real result or matched route that then errored
  if (E.isRight(result)) {
    if (result.right.type === 'ValidationError') {
      ctx.response.status = 400
      ctx.response.body = `${
        result.right.which
      }: ${result.right.message.join('\n')}`
      return
    } else if (
      result.right.type === 'NoResponseValidator'
    ) {
      ctx.response.status = 500
      ctx.response.body = 'Route has no response validator' // TODO - make this never happen by forcing return type validator in construction of Route
      return
    }

    ctx.response.status = result.right.code
    ctx.response.body = result.right.data

    return
  }

  ctx.response.status = 404
  ctx.response.body = 'Not Found'
  return
}
