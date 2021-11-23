import { RouteItem, routeLiteral } from './types/RouteItem'
import { AnyRoute, Route, emptyRoute } from './types/Route'
import { CR, makeRoute } from './makeRoute'

/**
 * Adds multiple route items and parameters by passing other `Route` items in a template string
 *
 * Both examples below are equivalent and would match
 * `GET /users/123/information`
 *
 * @example
 * const userId = param('userId', tt.NumberFromString)
 *
 * makeRoute(
 *   get,
 *   path`/users/${userId}/information`,
 *   response(200, t.literal('ok'))
 * )
 *
 * makeRoute(
 *   get,
 *   lit('users'),
 *   userId,
 *   lit('information'),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export function path(parts: TemplateStringsArray): Route
export function path<A extends AnyRoute>(
  parts: TemplateStringsArray,
  a: A
): A
export function path<
  A extends AnyRoute,
  B extends AnyRoute
>(parts: TemplateStringsArray, a: A, b: B): CR<A, B>
export function path<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute
>(
  parts: TemplateStringsArray,
  a: A,
  b: B,
  c: C
): CR<CR<A, B>, C>
export function path<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute
>(
  parts: TemplateStringsArray,
  a: A,
  b: B,
  c: C,
  d: D
): CR<CR<CR<A, B>, C>, D>
export function path<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute,
  E extends AnyRoute
>(
  parts: TemplateStringsArray,
  a: A,
  b: B,
  c: C,
  d: D,
  e: E
): CR<CR<CR<CR<A, B>, C>, D>, E>
export function path<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute,
  E extends AnyRoute,
  F extends AnyRoute
>(
  parts: TemplateStringsArray,
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F
): CR<CR<CR<CR<CR<A, B>, C>, D>, E>, F>

export function path(
  parts: TemplateStringsArray,
  a = emptyRoute,
  b = emptyRoute,
  c = emptyRoute,
  d = emptyRoute,
  e = emptyRoute,
  f = emptyRoute
): unknown {
  const literals: RouteItem[][] = parts.map((part) =>
    part
      .split('/')
      .filter((a) => a.length > 0)
      .map(routeLiteral)
  )
  const params = [a, b, c, d, e, f]

  // for each item in literals, smash another param after it
  return literals.reduce((all, lits, index) => {
    const nextParam = params[index]
    const literalRoute = { ...emptyRoute, parts: lits }
    return makeRoute(all, literalRoute, nextParam)
  }, emptyRoute)
}
