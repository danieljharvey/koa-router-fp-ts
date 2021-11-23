import * as Koa from 'koa'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/lib/function'
import * as NE from 'fp-ts/NonEmptyArray'
import * as A from 'fp-ts/Array'

import { runRouteWithHandler } from './runRoute'
import { neAltMany } from '../helpers/neAltMany'
import { Router } from '../types/Router'
import { openAPIHandler } from './openApiRoute'

/**
 * This turns an array of routes with handlers into a Koa middleware.
 *
 * @example
 * // the plan
 * const healthzRoute = makeRoute(
 *   get,
 *   lit('healthz'),
 *   response(200, t.string)
 * )
 *
 * // the implementation
 * const healthz = routeWithPureHandler(healthzRoute, () => respond(200, "ok"))
 *
 * // another implementation, why not?
 * const healthz2 = routeWithPureHandler(healthzRoute, () => respond(200, "yes, really ok"))
 *
 * // combine our two routes into a Koa middleware
 * const router = createRouter([healthz, healthz2])
 *
 * // create a Koa app
 * const app = new Koa()
 *
 * // do the necessary incantations
 * app.use(bodyParser()) // necessary
 * app.use(serve(router))
 *
 * // fly!
 * const server = app.listen(3000)
 *
 */
export const serve = (router: Router) => async (
  ctx: Koa.Context,
  next: () => Promise<unknown>
) => {
  const { url } = ctx.request
  const { method } = ctx.request
  const rawHeaders = ctx.request.headers
  const rawData = (ctx.request as any).body

  const tryAllRoutes = pipe(
    // all route handlers
    router.routeHandlers,
    // prepend swagger handler
    A.prepend(openAPIHandler(router)),
    // pass each one the route info
    NE.map((routeHandler) =>
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
    // we hit a route but it errored...
    if (E.isLeft(result.right)) {
      if (result.right.left.type === 'ValidationError') {
        ctx.response.status = 400
        ctx.response.body = `${
          result.right.left.which
        }: ${result.right.left.message.join('\n')}`
        return next()
      }

      ctx.response.status = 500
      ctx.response.body = 'Route has no response validator'
      return next()
    }
    // we hit a route and it succeeded
    ctx.response.status = result.right.right.code
    ctx.response.body = result.right.right.data

    // set all headers
    Object.entries<string>(
      result.right.right.headers
    ).forEach(([headerKey, headerValue]) => {
      ctx.set(headerKey, headerValue)
    })
    return next()
  }

  return next()
}
