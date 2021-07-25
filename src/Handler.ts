import { Route } from './Route'
import { MatchedRoute } from './matchRoute'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { flow } from 'fp-ts/lib/function'

export type TaskHandler<
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => T.Task<ResponseType>

export type TaskEitherHandler<
  SuccessResponseType extends {
    code: number
    data: unknown
  },
  FailureResponseType extends {
    code: number
    data: unknown
  },
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => TE.TaskEither<FailureResponseType, SuccessResponseType>

export type PromiseHandler<
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => Promise<ResponseType>

export type PureHandler<
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => ResponseType

export type EitherHandler<
  SuccessResponseType extends {
    code: number
    data: unknown
  },
  FailureResponseType extends {
    code: number
    data: unknown
  },
  Param,
  Query,
  Data,
  Headers
> = (
  input: MatchedRoute<Param, Query, Data, Headers>
) => E.Either<FailureResponseType, SuccessResponseType>

export type RouteWithHandler<
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
> = {
  type: 'RouteWithHandler'
  route: Route<ResponseType, Param, Query, Data, Headers>
  handler: TaskHandler<
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
    ? TaskHandler<ResponseType, Param, Query, Data, Headers>
    : never
  : never

export const routeWithTaskHandler = <
  ResponseType extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<ResponseType, Param, Query, Data, Headers>,
  handler: TaskHandler<
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

export const routeWithTaskEitherHandler = <
  SuccessResponseType extends {
    code: number
    data: unknown
  },
  FailureResponseType extends {
    code: number
    data: unknown
  },
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<
    SuccessResponseType | FailureResponseType,
    Param,
    Query,
    Data,
    Headers
  >,
  teHandler: TaskEitherHandler<
    SuccessResponseType,
    FailureResponseType,
    Param,
    Query,
    Data,
    Headers
  >
): RouteWithHandler<
  SuccessResponseType | FailureResponseType,
  Param,
  Query,
  Data,
  Headers
> => ({
  type: 'RouteWithHandler',
  route,
  handler: flow(
    teHandler,
    TE.fold(
      e =>
        T.of(e) as T.Task<
          FailureResponseType | SuccessResponseType
        >,
      a =>
        T.of(a) as T.Task<
          FailureResponseType | SuccessResponseType
        >
    )
  ),
})

export const routeWithPromiseHandler = <
  ResponseType extends {
    code: number
    data: unknown
  },
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<ResponseType, Param, Query, Data, Headers>,
  promiseHandler: PromiseHandler<
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
  handler: flow(promiseHandler, p => () => p),
})

export const routeWithPureHandler = <
  ResponseType extends {
    code: number
    data: unknown
  },
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<ResponseType, Param, Query, Data, Headers>,
  pureHandler: PureHandler<
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
  handler: flow(pureHandler, T.of),
})

export const routeWithEitherHandler = <
  SuccessResponseType extends {
    code: number
    data: unknown
  },
  FailureResponseType extends {
    code: number
    data: unknown
  },
  Param,
  Query,
  Data,
  Headers
>(
  route: Route<
    SuccessResponseType | FailureResponseType,
    Param,
    Query,
    Data,
    Headers
  >,
  eitherHandler: EitherHandler<
    SuccessResponseType,
    FailureResponseType,
    Param,
    Query,
    Data,
    Headers
  >
): RouteWithHandler<
  SuccessResponseType | FailureResponseType,
  Param,
  Query,
  Data,
  Headers
> => ({
  type: 'RouteWithHandler',
  route,
  handler: flow(
    eitherHandler,
    E.fold(
      e =>
        T.of(e) as T.Task<
          FailureResponseType | SuccessResponseType
        >,
      a =>
        T.of(a) as T.Task<
          FailureResponseType | SuccessResponseType
        >
    )
  ),
})
