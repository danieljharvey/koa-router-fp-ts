import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'

import { MatchedRoute } from '../matchRoute'

import { Route } from './Route'

export type AnyRouteWithHandler = RouteWithHandler<
  any,
  any,
  any,
  any,
  any,
  any
>

export type Handler<
  ResponseInput,
  Param,
  Query,
  Data,
  Headers
> =
  | TaskHandler<ResponseInput, Param, Query, Data, Headers>
  | TaskEitherHandler<
      ResponseInput,
      Param,
      Query,
      Data,
      Headers
    >
  | PromiseHandler<
      ResponseInput,
      Param,
      Query,
      Data,
      Headers
    >
  | PureHandler<ResponseInput, Param, Query, Data, Headers>
  | EitherHandler<
      ResponseInput,
      Param,
      Query,
      Data,
      Headers
    >

export type TaskHandler<
  ResponseInput,
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => T.Task<ResponseInput>

export type TaskEitherHandler<
  ResponseInput,
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => TE.TaskEither<ResponseInput, ResponseInput>

export type PromiseHandler<
  ResponseInput,
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => Promise<ResponseInput>

export type PureHandler<
  ResponseInput,
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => ResponseInput

export type EitherHandler<
  ResponseInput,
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => E.Either<ResponseInput, ResponseInput>

export type RouteWithHandler<
  ResponseInput,
  ResponseOutput,
  Param,
  Query,
  Data,
  Headers
> = {
  type: 'RouteWithHandler'
  route: Route<
    ResponseInput,
    ResponseOutput,
    Param,
    Query,
    Data,
    Headers
  >
  handler: TaskHandler<
    ResponseInput,
    Param,
    Query,
    Data,
    Headers
  >
}

/**
 * Given a route, returns the input it's Handler will receive
 */
export type HandlerInput<
  ThisRoute
> = ThisRoute extends Route<
  any,
  any,
  infer Param,
  infer Query,
  infer Data,
  infer Headers
>
  ? MatchedRoute<Param, Query, Data, Headers>
  : never

/**
 * Given a route, return it's response type
 */
export type RouteResponse<
  ThisRoute
> = ThisRoute extends Route<
  infer ResponseInput,
  any,
  any,
  any,
  any
>
  ? ResponseInput
  : never

/* Given a Route, return the type of a matching Handler function */
export type HandlerForRoute<
  ThisRoute
> = ThisRoute extends Route<
  infer ResponseInput,
  any,
  infer Param,
  infer Query,
  infer Data,
  infer Headers
>
  ? Handler<ResponseInput, Param, Query, Data, Headers>
  : never
