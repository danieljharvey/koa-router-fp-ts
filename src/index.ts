import * as Koa from 'koa'
import { Route, matchRoute } from './Route'
import * as E from 'fp-ts/Either'

export const router = <Param, Query, Data, Headers>(
  route: Route<Param, Query, Data, Headers>
) => async (
  ctx: Koa.Context,
  _next: () => Promise<unknown>
) => {
  const url = ctx.request.url
  const method = ctx.request.method
  const headers = ctx.request.headers

  const data = (ctx.request as any).body
  const result = matchRoute(route)(
    url,
    method,
    data,
    headers
  )

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
