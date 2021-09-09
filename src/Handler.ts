import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { flow } from 'fp-ts/lib/function';

import { MatchedRoute } from './matchRoute';
import { Route } from './Route';

export type TaskHandler<
  ResponseInput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers,
> = (input: MatchedRoute<Param, Query, Data, Headers>) => T.Task<ResponseInput>;

export type TaskEitherHandler<
  SuccessResponseInput extends {
    code: number;
    data: unknown;
  },
  FailureResponseInput extends {
    code: number;
    data: unknown;
  },
  Param,
  Query,
  Data,
  Headers,
> = (
  input: MatchedRoute<Param, Query, Data, Headers>,
) => TE.TaskEither<FailureResponseInput, SuccessResponseInput>;

export type PromiseHandler<
  ResponseInput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers,
> = (
  input: MatchedRoute<Param, Query, Data, Headers>,
) => Promise<ResponseInput>;

export type PureHandler<
  ResponseInput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers,
> = (input: MatchedRoute<Param, Query, Data, Headers>) => ResponseInput;

export type EitherHandler<
  SuccessResponseInput extends {
    code: number;
    data: unknown;
  },
  FailureResponseInput extends {
    code: number;
    data: unknown;
  },
  Param,
  Query,
  Data,
  Headers,
> = (
  input: MatchedRoute<Param, Query, Data, Headers>,
) => E.Either<FailureResponseInput, SuccessResponseInput>;

export type RouteWithHandler<
  ResponseInput extends { code: number; data: unknown },
  ResponseOutput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers,
> = {
  type: 'RouteWithHandler';
  route: Route<ResponseInput, ResponseOutput, Param, Query, Data, Headers>;
  handler: TaskHandler<ResponseInput, Param, Query, Data, Headers>;
};

export type HandlerInput<ThisRoute> = ThisRoute extends Route<
  any,
  any,
  infer Param,
  infer Query,
  infer Data,
  infer Headers
>
  ? MatchedRoute<Param, Query, Data, Headers>
  : never;

export type RouteResponse<ThisRoute> = ThisRoute extends Route<
  infer ResponseInput,
  any,
  any,
  any,
  any
>
  ? ResponseInput
  : never;

export type HandlerForRoute<ThisRoute> = ThisRoute extends Route<
  infer ResponseInput,
  infer Param,
  infer Query,
  infer Data,
  infer Headers
>
  ? ResponseInput extends { code: number; data: unknown }
    ? TaskHandler<ResponseInput, Param, Query, Data, Headers>
    : never
  : never;

export const routeWithTaskHandler = <
  ResponseInput extends { code: number; data: unknown },
  ResponseOutput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers,
>(
  route: Route<ResponseInput, ResponseOutput, Param, Query, Data, Headers>,
  handler: TaskHandler<ResponseInput, Param, Query, Data, Headers>,
): RouteWithHandler<
  ResponseInput,
  ResponseOutput,
  Param,
  Query,
  Data,
  Headers
> => ({
  type: 'RouteWithHandler',
  route,
  handler,
});

export const routeWithTaskEitherHandler = <
  SuccessResponseInput extends {
    code: number;
    data: unknown;
  },
  FailureResponseInput extends {
    code: number;
    data: unknown;
  },
  ResponseOutput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers,
>(
  route: Route<
    SuccessResponseInput | FailureResponseInput,
    ResponseOutput,
    Param,
    Query,
    Data,
    Headers
  >,
  teHandler: TaskEitherHandler<
    SuccessResponseInput,
    FailureResponseInput,
    Param,
    Query,
    Data,
    Headers
  >,
): RouteWithHandler<
  SuccessResponseInput | FailureResponseInput,
  ResponseOutput,
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
      (e) => T.of(e) as T.Task<FailureResponseInput | SuccessResponseInput>,
      (a) => T.of(a) as T.Task<FailureResponseInput | SuccessResponseInput>,
    ),
  ),
});

export const routeWithPromiseHandler = <
  ResponseInput extends {
    code: number;
    data: unknown;
  },
  ResponseOutput extends {
    code: number;
    data: unknown;
  },
  Param,
  Query,
  Data,
  Headers,
>(
  route: Route<ResponseInput, ResponseOutput, Param, Query, Data, Headers>,
  promiseHandler: PromiseHandler<ResponseInput, Param, Query, Data, Headers>,
): RouteWithHandler<
  ResponseInput,
  ResponseOutput,
  Param,
  Query,
  Data,
  Headers
> => ({
  type: 'RouteWithHandler',
  route,
  handler: flow(promiseHandler, (p) => () => p),
});

export const routeWithPureHandler = <
  ResponseInput extends {
    code: number;
    data: unknown;
  },
  ResponseOutput extends {
    code: number;
    data: unknown;
  },
  Param,
  Query,
  Data,
  Headers,
>(
  route: Route<ResponseInput, ResponseOutput, Param, Query, Data, Headers>,
  pureHandler: PureHandler<ResponseInput, Param, Query, Data, Headers>,
): RouteWithHandler<
  ResponseInput,
  ResponseOutput,
  Param,
  Query,
  Data,
  Headers
> => ({
  type: 'RouteWithHandler',
  route,
  handler: flow(pureHandler, T.of),
});

export const routeWithEitherHandler = <
  SuccessResponseInput extends {
    code: number;
    data: unknown;
  },
  FailureResponseInput extends {
    code: number;
    data: unknown;
  },
  ResponseOutput extends {
    code: number;
    data: unknown;
  },
  Param,
  Query,
  Data,
  Headers,
>(
  route: Route<
    SuccessResponseInput | FailureResponseInput,
    ResponseOutput,
    Param,
    Query,
    Data,
    Headers
  >,
  eitherHandler: EitherHandler<
    SuccessResponseInput,
    FailureResponseInput,
    Param,
    Query,
    Data,
    Headers
  >,
): RouteWithHandler<
  SuccessResponseInput | FailureResponseInput,
  ResponseOutput,
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
      (e) => T.of(e) as T.Task<FailureResponseInput | SuccessResponseInput>,
      (a) => T.of(a) as T.Task<FailureResponseInput | SuccessResponseInput>,
    ),
  ),
});
