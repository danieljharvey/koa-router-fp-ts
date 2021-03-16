import * as Koa from 'koa'
import { Route, matchRoute } from './Route'
import * as E from 'fp-ts/Either'

export const router = <Param>(route: Route<Param>) => (
  ctx: Koa.Context,
  _next: () => Promise<unknown>
) => {
  const url = ctx.request.url
  const method = ctx.request.method

  const result = matchRoute(route)(url, method)

  if (E.isRight(result)) {
    ctx.statusCode = 200
    ctx.body = 'Found'
  }
}
