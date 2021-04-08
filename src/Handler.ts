import { Route } from './Route'
import {
  MatchedRoute,
  MatchInputs,
  matchRoute,
} from './matchRoute'
import {
  MatchError,
  noResponseValidator,
  validationError,
} from './MatchError'
import * as D from './Decoder'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/lib/function'
import * as t from 'io-ts'
import * as E from 'fp-ts/Either'

export type Handler<
  Param,
  Query,
  Data,
  Headers,
  ResponseType extends { code: number; data: unknown }
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => T.Task<ResponseType>

export type RouteWithHandler<
  Param,
  Query,
  Data,
  Headers,
  ResponseType extends { code: number; data: unknown }
> = {
  type: 'RouteWithHandler'
  route: Route<ResponseType, Param, Query, Data, Headers>
  handler: Handler<
    Param,
    Query,
    Data,
    Headers,
    ResponseType
  >
}

export const routeWithHandler = <
  Param,
  Query,
  Data,
  Headers,
  ResponseType extends { code: number; data: unknown }
>(
  route: Route<ResponseType, Param, Query, Data, Headers>,
  handler: Handler<
    Param,
    Query,
    Data,
    Headers,
    ResponseType
  >
): RouteWithHandler<
  Param,
  Query,
  Data,
  Headers,
  ResponseType
> => ({
  type: 'RouteWithHandler',
  route,
  handler,
})

export const runRouteWithHandler = <
  Param,
  Query,
  Data,
  Headers,
  ResponseType extends { code: number; data: unknown }
>(
  routeWithHandler: RouteWithHandler<
    Param,
    Query,
    Data,
    Headers,
    ResponseType
  >
): ((
  inputs: MatchInputs
) => TE.TaskEither<MatchError, ResponseType>) => {
  return flow(
    matchRoute(routeWithHandler.route),
    TE.fromEither,
    TE.chain((matchedRoute) =>
      TE.fromTask(routeWithHandler.handler(matchedRoute))
    ),
    TE.chainEitherKW(
      validateResponse(
        routeWithHandler.route.responseDecoder
      )
    )
  )
}

const validateResponse = <ResponseType>(
  responseDecoder: D.Decoder<ResponseType>
) => (resp: unknown) =>
  responseDecoder.type === 'Decoder'
    ? pipe(
        resp,
        responseDecoder.decoder.decode,
        E.mapLeft(validationError('response'))
      )
    : E.left(noResponseValidator() as MatchError)

export const response = <Code extends number, Data>(
  code: Code,
  data: Data
) => ({
  code,
  data,
})
