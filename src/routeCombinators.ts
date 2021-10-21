import * as t from 'io-ts'
import * as O from 'fp-ts/Option'

import {
  RouteItem,
  routeLiteral,
  routeParam,
} from './RouteItem'
import {
  AnyRoute,
  EmptyRec,
  Route,
  emptyRoute,
} from './Route'
import * as E from './Encoder'
import { CR, makeRoute } from './makeRoute'

export const get: Route = {
  ...emptyRoute,
  method: O.some('GET'),
}

export const post: Route = {
  ...emptyRoute,
  method: O.some('POST'),
}

export const lit = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

export function routes(parts: TemplateStringsArray): Route
export function routes<A extends AnyRoute>(
  parts: TemplateStringsArray,
  a: A
): A
export function routes<
  A extends AnyRoute,
  B extends AnyRoute
>(parts: TemplateStringsArray, a: A, b: B): CR<A, B>
export function routes<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute
>(
  parts: TemplateStringsArray,
  a: A,
  b: B,
  c: C
): CR<CR<A, B>, C>
export function routes<
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
export function routes<
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
export function routes<
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

export function routes(
  parts: TemplateStringsArray,
  a = emptyRoute,
  b = emptyRoute,
  c = emptyRoute,
  d = emptyRoute,
  e = emptyRoute,
  f = emptyRoute
): unknown {
  const literals: RouteItem[][] = parts.map(part =>
    part
      .split('/')
      .filter(a => a.length > 0)
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

export const response = <
  StatusCode extends number,
  ResponseInput,
  ResponseOutput
>(
  statusCode: StatusCode,
  encoder: t.Type<ResponseInput, ResponseOutput, unknown>,
  metadata: E.Metadata = {}
): Route<
  { code: StatusCode; data: ResponseInput },
  { code: StatusCode; data: ResponseOutput }
> => ({
  ...emptyRoute,
  responseEncoder: E.makeEncoder(
    statusCode,
    encoder,
    metadata
  ),
})

export const param = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>
): Route<never, never, Record<ParamName, Param>> => ({
  ...emptyRoute,
  parts: [routeParam(param)],
  paramDecoder: {
    type: 'Decoder',
    decoder: t.type({
      [param]: decoder,
    } as Record<ParamName, t.Type<Param, unknown, unknown>>),
  },
})

export const params = <Param>(
  paramDecoder: t.Type<Param, unknown, unknown>
): Route<never, never, Param> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
})

export const query = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>
): Route<never, never, EmptyRec, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
})

export const data = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>
): Route<never, never, EmptyRec, EmptyRec, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
})

export const headers = <Headers>(
  headersDecoder: t.Type<Headers, unknown, unknown>
): Route<
  never,
  never,
  EmptyRec,
  EmptyRec,
  EmptyRec,
  Headers
> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: headersDecoder,
  },
})

export const description = (
  description: string
): Route => ({ ...emptyRoute, description: [description] })
