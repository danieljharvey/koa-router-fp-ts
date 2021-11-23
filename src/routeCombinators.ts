import * as t from 'io-ts'

import { routeLiteral, routeParam } from './types/RouteItem'
import { EmptyRec, Route, emptyRoute } from './types/Route'
import * as E from './types/Encoder'

// NOTE: this file is in prettierignore as the Typescript string interpolations
// break Prettier. Once Prettier is updated (2.4.1 was fine, perhaps earlier),
// remove it from prettierignore and have a good time.

/**
 * Adds a string to the expected route
 * 
 * The following would match `GET /nice/horse/`
 * But not `GET /nice/something-else/horse/`
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('nice'),
 *   lit('horse'),
 *   response(200, t.literal('ok'))
 * )
 *

 *
 */
export const lit = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

/**
 * Adds an expected response type for the route
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('might-fail'),
 *   response(200, t.literal('ok')),
 *   response(500, t.literal('oh no'))
 * )
 *
 */
export const response = <
  StatusCode extends number,
  ResponseInput,
  ResponseOutput
>(
  statusCode: StatusCode,
  encoder: t.Type<ResponseInput, ResponseOutput, unknown>,
  metadata: E.Metadata = {}
): Route<
  {
    code: StatusCode
    data: ResponseInput
    headers: E.HeaderReturn
  },
  {
    code: StatusCode
    data: ResponseOutput
    headers: E.HeaderReturn
  }
> => ({
  ...emptyRoute,
  responseEncoder: E.makeEncoder(
    statusCode,
    encoder,
    metadata
  ),
})

/**
 * Adds a parameter to the path that can be captured. Must supply a name for it and an `io-ts` decoder
 * to turn it from a string into the required type
 *
 * The following would match `GET /user/1231232`
 * however, `GET /user/not-a-number` would fail validation
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('user'),
 *   param('userId',t.NumberFromString),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const param = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, string, unknown>
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

/**
 * Adds a query parameter to the matcher, along with a decoder. As any query param can be used multiple times, the return type will be wrapped in an array.
 *
 * The following would match `GET /user/?id=123` or `GET /user/?id=123&id=456`
 * however, `GET /user/not-a-number` would fail validation
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('user'),
 *   query('id',t.NumberFromString),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const query = <QueryName extends string, Query>(
  queryName: QueryName,
  queryDecoder: t.Type<Query, string, unknown>
): Route<
  never,
  never,
  EmptyRec,
  Record<QueryName, Query[]>
> => ({
  ...emptyRoute,
  queryDecoder: {
    type: 'Decoder',
    decoder: t.type({
      [queryName]: t.array(queryDecoder),
    } as Record<QueryName, t.ArrayC<t.Type<Query, string, unknown>>>),
  },
})

/**
 * Adds an `io-ts` decoder for expected POST data
 *
 * The following would match when posting `{ name: "Mr Horse", age: 100 }` to `POST /send-me-things`
 *
 * @example
 * makeRoute(
 *   post,
 *   lit('send-me-things'),
 *   data(t.type({name:t.string, age:t.number})),
 *   response(200, t.literal('thanks')),
 * )
 *
 */
export const data = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>
): Route<never, never, EmptyRec, EmptyRec, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
})

/**
 * Adds a single header that is required for the route to match. Must supply a name for it and an `io-ts` decoder
 * to turn it from a string into the required type
 *
 * Here, we'd need a header like `auth-token: 123123123` for this route to match
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('user'),
 *   header('auth-token', t.NumberFromString),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const header = <HeaderName extends string, Header>(
  headerName: HeaderName,
  decoder: t.Type<Header, unknown, unknown>
): Route<
  never,
  never,
  EmptyRec,
  EmptyRec,
  EmptyRec,
  Record<`${Lowercase<HeaderName>}`, Header>
> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: t.type({
      [headerName.toLowerCase()]: decoder,
    } as Record<`${Lowercase<HeaderName>}`, t.Type<Header, string, unknown>>),
  },
})

/**
 * Adds a description for the route that will be displayed in OpenAPI
 * documentation. Multiple descriptions will be concatenated together with a
 * newline.
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('healthz'),
 *   description('Returns a 200 status code to report the service is running'),
 *   respond(200, t.literal('ok'))
 * )
 */
export const description = (
  description: string
): Route => ({
  ...emptyRoute,
  description: [description],
})

/**
 * Adds a summary of the route that will be displayed in OpenAPI
 * documentation. Multiple summaries will be concatenated together with a
 * newline.
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('healthz'),
 *   summary('Healthcheck endpoint'),
 *   respond(200, t.literal('ok'))
 * )
 */
export const summary = (summary: string): Route => ({
  ...emptyRoute,
  summary: [summary],
})
