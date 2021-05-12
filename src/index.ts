import * as Koa from 'koa'
import {
  RouteWithHandler,
  runRouteWithHandler,
} from './Handler'
import * as E from 'fp-ts/Either'

export const router = <
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
>(
  routeWithHandler: RouteWithHandler<
    ResponseType,
    Param,
    Query,
    Data,
    Headers
  >
) => async (
  ctx: Koa.Context,
  _next: () => Promise<unknown>
) => {
  const url = ctx.request.url
  const method = ctx.request.method
  const rawHeaders = ctx.request.headers
  const rawData = (ctx.request as any).body

  const result = await runRouteWithHandler(
    routeWithHandler
  )({
    url,
    method,
    rawData,
    rawHeaders,
  })()

  if (E.isRight(result)) {
    ctx.response.status = 200
    ctx.response.body = 'Found'

    return
  } else {
    if (result.left.type === 'ValidationError') {
      ctx.response.status = 400
      ctx.response.body = result.left.message
      return
    }
  }
}
