import { AnyRouteWithHandler } from './Handler'

/**
 * Creates a `Router` from an array of routes with Handlers. This can be turned
 * into a Koa middleware with `serve`, or turned into documentation.
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
export const createRouter = (
  routeHandlers: AnyRouteWithHandler[],
  metadata: Partial<RouterMetadata> = {},
  openAPIPath = 'swagger.json'
): Router => ({
  type: 'Router',
  routeHandlers,
  metadata,
  openAPIPath,
})

export type RouterMetadata = {
  title: string
  description: string
  version: string
}

export type Router = {
  type: 'Router'
  routeHandlers: AnyRouteWithHandler[]
  metadata: Partial<RouterMetadata>
  openAPIPath: string
}
