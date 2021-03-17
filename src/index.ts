import * as Koa from 'koa'
import { Route, matchRoute } from './Route'
import * as E from 'fp-ts/Either'

export const router = <Param>(
  route: Route<Param>
) => async (
  ctx: Koa.Context,
  _next: () => Promise<unknown>
) => {
  const url = ctx.request.url
  const method = ctx.request.method

  const result = matchRoute(route)(url, method)

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
