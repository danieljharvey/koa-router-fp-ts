import {
  MatchedRoute,
  Route,
  MatchInputs,
  matchRoute,
  MatchError,
} from './Route'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/lib/function'

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
  route: Route<Param, Query, Data, Headers>
  handler: Handler<Param, Query, Data, Headers, ReturnType>
}

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
    TE.chain((matchedRoute) =>
      TE.fromTask(routeWithHandler.handler(matchedRoute))
    )
  )
