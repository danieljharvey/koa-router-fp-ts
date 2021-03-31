import {
  MatchedRoute,
  Route,
  MatchInputs,
  matchRoute,
} from './Route'
import { MatchError, validationError} from './MatchError'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { pipe, flow } from 'fp-ts/lib/function'
import * as t from 'io-ts'
import * as E from 'fp-ts/Either'

export type Handler<
  Param,
  Query,
  Data,
  Headers,
  ReturnType extends { code: number; data: unknown }
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => T.Task<ReturnType>

export type RouteWithHandler<
  Param,
  Query,
  Data,
  Headers,
  ReturnType extends { code: number; data: unknown }
> = {
  type: 'RouteWithHandler'
  route: Route<Param, Query, Data, Headers>
  handler: Handler<Param, Query, Data, Headers, ReturnType>
  responseDecoder: t.Type<ReturnType, unknown, unknown>
}

export const routeWithHandler = <
  Param,
  Query,
  Data,
  Headers,
  ReturnType extends { code: number; data: unknown }
>(
  route: Route<Param, Query, Data, Headers>,
  responseDecoder: t.Type<ReturnType, unknown, unknown>,
  handler: Handler<Param, Query, Data, Headers, ReturnType>,
): RouteWithHandler<
  Param,
  Query,
  Data,
  Headers,
  ReturnType
> => ({
  type: 'RouteWithHandler',
  route,
  handler,
  responseDecoder,
})

export const runRouteWithHandler = <
  Param,
  Query,
  Data,
  Headers,
  ReturnType extends { code: number; data: unknown }
>(
  routeWithHandler: RouteWithHandler<
    Param,
    Query,
    Data,
    Headers,
    ReturnType
  >
): ((
  inputs: MatchInputs
) => TE.TaskEither<MatchError, ReturnType>) =>
  flow(
    matchRoute(routeWithHandler.route),
    TE.fromEither,
    TE.chain(matchedRoute =>
      TE.fromTask(routeWithHandler.handler(matchedRoute))
    ),
    TE.chainEitherKW(
      flow(
        routeWithHandler.responseDecoder.decode,
        E.mapLeft(validationError('response'))
      )
    )
  )

export const response = <Code extends number, Data>(
  code: Code,
  data: Data
) => ({
  code,
  data,
})
