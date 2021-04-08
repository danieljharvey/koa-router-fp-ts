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

import * as E from 'fp-ts/Either'

export type Handler<
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => T.Task<ResponseType>

export type RouteWithHandler<
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
> = {
  type: 'RouteWithHandler'
  route: Route<ResponseType, Param, Query, Data, Headers>
  handler: Handler<
    ResponseType,
    Param,
    Query,
    Data,
    Headers
  >
}

export const routeWithHandler = <
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<ResponseType, Param, Query, Data, Headers>,
  handler: Handler<
    ResponseType,
    Param,
    Query,
    Data,
    Headers
  >
): RouteWithHandler<
  ResponseType,
  Param,
  Query,
  Data,
  Headers
> => ({
  type: 'RouteWithHandler',
  route,
  handler,
})

export const runRouteWithHandler = <
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
>(
  routeWithHandler: RouteWithHandler<
    ResponseType,
    Param,
    Query,
    Data,
    Headers
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

export const makeResponse = <Code extends number, Data>(
  code: Code,
  data: Data
) => ({
  code,
  data,
})
