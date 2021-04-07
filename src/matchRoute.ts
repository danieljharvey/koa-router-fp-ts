import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { pipe, identity } from 'fp-ts/function'
import * as Ap from 'fp-ts/Apply'
import {
  MatchError,
  validationError,
  noMatch,
} from './MatchError'
import { RouteItem } from './RouteItem'
import { Method } from './Method'
import { Route } from './Route'

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
  method: O.Option<Method>,
  requestMethod: string
): boolean =>
  pipe(
    method,
    O.map(
      m => m.toLowerCase() === requestMethod.toLowerCase()
    ),
    O.fold(() => false, identity)
  )

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
    E.chainW(matches =>
      pipe(
        route.paramDecoder.type === 'Decoder'
          ? route.paramDecoder.decoder.decode(matches)
          : E.right(neverValue as Param),
        E.mapLeft(validationError('request'))
      )
    )
  )

  const queryMatches = pipe(
    route.queryDecoder.type === 'Decoder'
      ? route.queryDecoder.decoder.decode(queryParams)
      : E.right({} as Query),
    E.mapLeft(validationError('request'))
  )

  const dataMatches = pipe(
    route.dataDecoder.type === 'Decoder'
      ? route.dataDecoder.decoder.decode(rawData)
      : E.right({} as Data),
    E.mapLeft(validationError('request'))
  )

  const headersMatches = pipe(
    route.headersDecoder.type === 'Decoder'
      ? route.headersDecoder.decoder.decode(rawHeaders)
      : E.right({} as Headers),
    E.mapLeft(validationError('request'))
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
