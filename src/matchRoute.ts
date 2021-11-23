import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as Ap from 'fp-ts/Apply'

import {
  MatchError,
  validationError,
  noMatch,
} from './types/MatchError'
import { Route } from './types/Route'
import {
  splitUrl,
  getDefaults,
  matchMethod,
  matchRouteItem,
  flattenParams,
  parseQueryParams,
} from './helpers/matchHelpers'

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

/**
 *
 * This does the route matching. Given all the interesting parts of the request, it checks whether this is a route we are interested in.
 *
 * Most of this is mashing the data till into a shape that can be compared with the `io-ts` validators for each kind of data
 */
export const matchRoute = <
  ResponseInput,
  ResponseOutput,
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<
    ResponseInput,
    ResponseOutput,
    Param,
    Query,
    Data,
    Headers
  >
) => ({
  url,
  method,
  rawData,
  rawHeaders,
}: MatchInputs): E.Either<
  MatchError,
  MatchedRoute<Param, Query, Data, Headers>
> => {
  const decodedUrl = decodeURI(url)
  const items = splitUrl(decodedUrl)
  const queryParams = {
    ...getDefaults(route.queryDecoder, []),
    ...parseQueryParams(decodedUrl),
  }
  const headers = {
    ...getDefaults(route.headersDecoder, undefined),
    ...rawHeaders,
  }
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
        E.mapLeft(validationError('params'))
      )
    )
  )

  const queryMatches = pipe(
    route.queryDecoder.type === 'Decoder'
      ? route.queryDecoder.decoder.decode(queryParams)
      : E.right({} as Query),
    E.mapLeft(validationError('query'))
  )

  const dataMatches = pipe(
    route.dataDecoder.type === 'Decoder'
      ? route.dataDecoder.decoder.decode(rawData)
      : E.right({} as Data),
    E.mapLeft(validationError('body'))
  )

  const headersMatches = pipe(
    route.headersDecoder.type === 'Decoder'
      ? route.headersDecoder.decoder.decode(headers)
      : E.right({} as Headers),
    E.mapLeft(validationError('headers'))
  )

  const sequenceT = Ap.sequenceT(E.Apply)
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
