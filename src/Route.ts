// import * as t from 'io-ts'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import reporter from 'io-ts-reporters'
import * as Ap from 'fp-ts/Apply'
import { numberDecoder } from './decoders'
import { formatWithCursor } from 'prettier'

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

export type Route<
  Param = {},
  Query = {},
  Data = {},
  Headers = {}
> = {
  method: Method
  parts: RouteItem[]
  paramDecoder: Decoder<Param>
  queryDecoder: Decoder<Query>
  dataDecoder: Decoder<Data>
  headersDecoder: Decoder<Headers>
}

export const combineRoutes = <
  ParamB extends GenericRec,
  QueryB extends GenericRec,
  DataB extends GenericRec,
  HeadersB extends GenericRec
>(
  b: Route<ParamB, QueryB, DataB, HeadersB>
) => <
  ParamA extends GenericRec,
  QueryA extends GenericRec,
  DataA extends GenericRec,
  HeadersA extends GenericRec
>(
  a: Route<ParamA, QueryA, DataA, HeadersA>
): Route<
  ParamA & ParamB,
  QueryA & QueryB,
  DataA & DataB,
  HeadersA & HeadersB
> => ({
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
  dataDecoder: combineParamDecoder(
    a.dataDecoder,
    b.dataDecoder
  ),
  headersDecoder: combineParamDecoder(
    a.headersDecoder,
    b.headersDecoder
  ),
})

export const emptyRoute: Route<{}, {}, {}, {}> = {
  method: 'GET',
  parts: [],
  paramDecoder: { type: 'NoDecoder' },
  queryDecoder: { type: 'NoDecoder' },
  dataDecoder: { type: 'NoDecoder' },
  headersDecoder: { type: 'NoDecoder' },
}

export const getRoute = emptyRoute

export const postRoute: Route = {
  ...emptyRoute,
  method: 'POST',
}

const literal = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

export const lit = (lit: string) =>
  flow(combineRoutes(literal(lit)))

export const param = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>
): (<
  ParamA extends GenericRec,
  QueryA extends GenericRec,
  DataA extends GenericRec,
  HeadersA extends GenericRec
>(
  route: Route<ParamA, QueryA, DataA, HeadersA>
) => Route<
  ParamA & Record<ParamName, Param>,
  QueryA,
  DataA,
  HeadersA
>) => flow(combineRoutes(parameter(param, decoder)))

const parameter = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>
): Route<Record<ParamName, Param>> => ({
  ...emptyRoute,
  parts: [routeParam(param)],
  paramDecoder: {
    type: 'Decoder',
    decoder: (t.type({
      [param]: decoder,
    }) as unknown) as t.TypeC<
      Record<ParamName, t.Type<Param, unknown, unknown>>
    >,
  },
})

export const validateParams = <Param>(
  paramDecoder: t.Type<Param, unknown, unknown>
): Route<Param> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
})

export const validateQuery = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>
): Route<{}, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
})

export const validateData = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>
): Route<{}, {}, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
})

export const validateHeaders = <Headers>(
  headersDecoder: t.Type<Headers, unknown, unknown>
): Route<{}, {}, {}, Headers> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: headersDecoder,
  },
})

const methods: Method[] = ['GET', 'POST']

type GenericRec = Record<string, unknown>

const combineParamDecoder = <
  ParamA extends GenericRec,
  ParamB extends GenericRec
>(
  a: Decoder<ParamA>,
  b: Decoder<ParamB>
): Decoder<ParamA & ParamB> => {
  if (a.type !== 'Decoder' && b.type === 'Decoder') {
    return b as Decoder<ParamA & ParamB>
  }
  if (a.type === 'Decoder' && b.type !== 'Decoder') {
    return a as Decoder<ParamA & ParamB>
  }
  if (a.type === 'Decoder' && b.type === 'Decoder') {
    return {
      type: 'Decoder',
      decoder: t.intersection([a.decoder, b.decoder]),
    }
  }
  return { type: 'NoDecoder' }
}

const combineMethod = (a: Method, b: Method): Method => {
  const aIndex = methods.findIndex((i) => i === a)
  const bIndex = methods.findIndex((i) => i === b)

  if (aIndex === -1 && bIndex === -1) {
    return 'GET'
  }
  const highest = Math.max(aIndex, bIndex)
  return methods[highest]
}

const splitUrl = (whole: string): string[] => {
  const pt1 = whole.split('?')[0]
  return pt1.split('/').filter((a) => a.length > 0)
}

const parseQueryParams = (
  whole: string
): Record<string, string> => {
  const end = whole.split('?')[1]
  if (!end) {
    return {}
  }
  const as = end.split('&').map((a) => a.split('='))

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

export type MatchError =
  | ReturnType<typeof noMatch>
  | ReturnType<typeof validationError>

export type MatchedRoute<Param, Query, Data, Headers> = {
  params: Param
  query: Query
  data: Data
  headers: Headers
}

export type MatchInputs = {
  url: string
  method: string
  rawData: unknown
  rawHeaders: Record<string, unknown>
}

export const matchRoute = <Param, Query, Data, Headers>(
  route: Route<Param, Query, Data, Headers>
) => ({
  url,
  method,
  rawData,
  rawHeaders,
}: MatchInputs): E.Either<
  MatchError,
  MatchedRoute<Param, Query, Data, Headers>
> => {
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
    E.chainW((matches) =>
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

  const dataMatches = pipe(
    route.dataDecoder.type === 'Decoder'
      ? route.dataDecoder.decoder.decode(rawData)
      : E.right({} as Data),
    E.mapLeft(validationError)
  )

  const headersMatches = pipe(
    route.headersDecoder.type === 'Decoder'
      ? route.headersDecoder.decoder.decode(rawHeaders)
      : E.right({} as Headers),
    E.mapLeft(validationError)
  )

  const sequenceT = Ap.sequenceT(E.either)
  return pipe(
    sequenceT(
      paramMatches,
      queryMatches,
      dataMatches,
      headersMatches
    ),
    E.map(([params, query, data, headers]) => ({
      params,
      query,
      data,
      headers,
    }))
  )
}

const neverValue = {} as any
