import { Route } from './Route'
import {
  MatchedRoute,
  MatchInputs,
  matchRoute,
} from './matchRoute'
import {
  MatchError,
  NoMatchError,
  MatchValidationError,
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

export type HandlerInput<
  ThisRoute
> = ThisRoute extends Route<
  any,
  infer Param,
  infer Query,
  infer Data,
  infer Headers
>
  ? MatchedRoute<Param, Query, Data, Headers>
  : never

export type HandlerForRoute<
  ThisRoute
> = ThisRoute extends Route<
  infer ResponseType,
  infer Param,
  infer Query,
  infer Data,
  infer Headers
>
  ? ResponseType extends { code: number; data: unknown }
    ? Handler<ResponseType, Param, Query, Data, Headers>
    : never
  : never

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
) => TE.TaskEither<
  NoMatchError,
  ResponseType | MatchValidationError
>) => {
  return flow(
    matchRoute(routeWithHandler.route),
    TE.fromEither,
    TE.chain(matchedRoute =>
      TE.fromTask(routeWithHandler.handler(matchedRoute))
    ),
    TE.chainEitherKW(
      validateResponse(
        routeWithHandler.route.responseDecoder
      )
    ),
    TE.orElseW(e =>
      e.type === 'NoMatchError' ? TE.left(e) : TE.right(e)
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

export const respond = <Code extends number, Data>(
  code: Code,
  data: Data
) => ({
  code,
  data,
})
