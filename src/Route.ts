// import * as t from 'io-ts'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import reporter from 'io-ts-reporters'
import * as Ap from 'fp-ts/Apply'

export const routeLiteral = (literal: string) => ({
  type: 'Literal' as const,
  literal,
})

export const routeParam = (name: string) => ({
  type: 'Param' as const,
  name,
})

type RouteItem =
  | ReturnType<typeof routeLiteral>
  | ReturnType<typeof routeParam>

type Method = 'GET' | 'POST'

type Decoder<A> =
  | {
      type: 'Decoder'
      decoder: t.Type<A, unknown, unknown>
    }
  | { type: 'NoDecoder' }

export type Route<Param, Query> = {
  method: Method
  parts: RouteItem[]
  paramDecoder: Decoder<Param>
  queryDecoder: Decoder<Query>
}

export const combineRoutes = <ParamB, QueryB>(
  b: Route<ParamB, QueryB>
) => <ParamA, QueryA>(
  a: Route<ParamA, QueryA>
): Route<ParamA | ParamB, QueryA | QueryB> => ({
  method: combineMethod(a.method, b.method),
  parts: [...a.parts, ...b.parts],
  paramDecoder: combineParamDecoder(
    a.paramDecoder,
    b.paramDecoder
  ),
  queryDecoder: combineParamDecoder(
    a.queryDecoder,
    b.queryDecoder
  ),
})

export const emptyRoute: Route<never, never> = {
  method: 'GET',
  parts: [],
  paramDecoder: { type: 'NoDecoder' },
  queryDecoder: { type: 'NoDecoder' },
}

export const getRoute = emptyRoute

export const postRoute: Route<never, never> = {
  ...emptyRoute,
  method: 'POST',
}

export const literal = (
  literal: string
): Route<never, never> => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

export const param = (
  param: string
): Route<never, never> => ({
  ...emptyRoute,
  parts: [routeParam(param)],
})

export const validateParams = <Param>(
  paramDecoder: t.Type<Param, unknown, unknown>
): Route<Param, never> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
})

export const validateQuery = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>
): Route<never, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
})

const methods: Method[] = ['GET', 'POST']

const combineParamDecoder = <ParamA, ParamB>(
  a: Decoder<ParamA>,
  b: Decoder<ParamB>
): Decoder<ParamA | ParamB> => {
  if (a.type !== 'Decoder' && b.type === 'Decoder') {
    return b as Decoder<ParamA | ParamB>
  }
  if (a.type === 'Decoder' && b.type !== 'Decoder') {
    return a as Decoder<ParamA | ParamB>
  }
  if (a.type === 'Decoder' && b.type === 'Decoder') {
    return {
      type: 'Decoder',
      decoder: t.union([a.decoder, b.decoder]),
    }
  }
  return { type: 'NoDecoder' }
}

const combineMethod = (a: Method, b: Method): Method => {
  const aIndex = methods.findIndex(i => i === a)
  const bIndex = methods.findIndex(i => i === b)

  if (aIndex === -1 && bIndex === -1) {
    return 'GET'
  }
  const highest = Math.max(aIndex, bIndex)
  return methods[highest]
}

const splitUrl = (whole: string): string[] => {
  const pt1 = whole.split('?')[0]
  return pt1.split('/').filter(a => a.length > 0)
}

const parseQueryParams = (
  whole: string
): Record<string, string> => {
  const end = whole.split('?')[1]
  if (!end) {
    return {}
  }
  const as = end.split('&').map(a => a.split('='))

  return flattenParams(
    as.map(([key, val]) => ({ [key]: val }))
  )
}

const matchMethod = (
  method: Method,
  requestMethod: string
) => method.toLowerCase() === requestMethod.toLowerCase()

const matchRouteItem = (
  routeItem: RouteItem,
  urlPart: string
): E.Either<MatchError, Record<string, string>> => {
  switch (routeItem.type) {
    case 'Literal':
      return routeItem.literal.toLowerCase() ===
        urlPart.toLowerCase()
        ? E.right({})
        : E.left(
            noMatch(
              `${urlPart} did not match ${routeItem.literal}`
            )
          )
    case 'Param':
      return E.right({ [routeItem.name]: urlPart })
  }
}

const flattenParams = (
  params: readonly Record<string, string>[]
): Record<string, string> =>
  params.reduce((all, a) => ({ ...all, ...a }), {})

const noMatch = (message: string) => ({
  type: 'NoMatchError' as const,
  message,
})

const validationError = (errors: t.Errors) => ({
  type: 'ValidationError' as const,
  message: reporter.report(E.left(errors)),
})

type MatchError =
  | ReturnType<typeof noMatch>
  | ReturnType<typeof validationError>

type MatchedRoute<Param> = {
  params: Param
}

export const matchRoute = <Param, Query>(
  route: Route<Param, Query>
) => (
  url: string,
  method: string
): E.Either<MatchError, MatchedRoute<Param>> => {
  const items = splitUrl(url)
  const queryParams = parseQueryParams(url)
  const pairs = A.zip(route.parts, items)

  if (
    pairs.length !== route.parts.length ||
    pairs.length !== items.length
  ) {
    return E.left(
      noMatch('Route does not match url parts length')
    )
  }

  if (!matchMethod(route.method, method)) {
    return E.left(
      noMatch(`Method does not match ${route.method}`)
    )
  }

  const params = pipe(
    pairs,
    E.traverseArray(([routePart, urlPart]) =>
      matchRouteItem(routePart, urlPart)
    ),
    E.map(flattenParams)
  )

  const paramMatches = pipe(
    params,
    E.chainW(matches =>
      pipe(
        route.paramDecoder.type === 'Decoder'
          ? route.paramDecoder.decoder.decode(matches)
          : E.right(neverValue as Param),
        E.mapLeft(validationError)
      )
    )
  )

  const queryMatches = pipe(
    route.queryDecoder.type === 'Decoder'
      ? route.queryDecoder.decoder.decode(queryParams)
      : E.right({} as Query),
    E.mapLeft(validationError)
  )

  const sequenceT = Ap.sequenceT(E.either)
  return pipe(
    sequenceT(paramMatches, queryMatches),
    E.map(([params, query]) => ({ params, query }))
  )
}

const neverValue = {} as any
