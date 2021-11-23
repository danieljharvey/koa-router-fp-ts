import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { flow } from 'fp-ts/lib/function'

import { Route } from '../types/Route'
import {
  RouteWithHandler,
  TaskEitherHandler,
  PromiseHandler,
  PureHandler,
  EitherHandler,
  TaskHandler,
} from '../types/Handler'

/* I heard you love giant type signatures, this is the file with the giant type signatures */

/**
 * Takes a route and a matching handler, that returns the result inside an `fp-ts` `Task`.
 *
 * @example
 * const healthzRoute = makeRoute(
 *   get,
 *   lit('healthz'),
 *   response(200, t.string)
 * )
 *
 * // the implementation
 * const healthz = taskHandler(healthzRoute, () => T.of(respond(200, "ok")))
 *
 */
export const taskHandler = <
  ResponseInput extends { code: number; data: unknown },
  ResponseOutput extends { code: number; data: unknown },
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
  >,
  handler: TaskHandler<
    ResponseInput,
    Param,
    Query,
    Data,
    Headers
  >
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
})

/**
 * Takes a route and a matching handler, that returns the result inside an `fp-ts` `TaskEither`.
 *
 * @example
 * const userRoute = makeRoute(
 *   get,
 *   lit('user'),
 *   param('id',tt.NumberFromString),
 *   response(200, t.string),
 *   response(400, t.string),
 * )
 *
 * const healthz = taskEitherHandler(userRoute,
 *   ({ params: { id }}) =>
 *      id === 42
 *       ? TE.right(respond(200,"great job"))
 *       : TE.left(respond(400,"big error"))
 * )
 *
 */
export const taskEitherHandler = <
  ResponseInput extends {
    code: number
    data: unknown
  },
  ResponseOutput extends { code: number; data: unknown },
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
  >,
  teHandler: TaskEitherHandler<
    ResponseInput,
    Param,
    Query,
    Data,
    Headers
  >
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
  handler: flow(
    teHandler,
    TE.fold(
      (e) => T.of(e) as T.Task<ResponseInput>,
      (a) => T.of(a) as T.Task<ResponseInput>
    )
  ),
})

/**
 * Takes a route and a matching handler, that returns the result inside a succeeding Javascript Promise
 * Be aware that if the Promise rejects then all bets with type safety are off and you'll most likely receive
 * Koa's standard error response
 *
 * @example
 * const healthzRoute = makeRoute(
 *   get,
 *   lit('healthz'),
 *   response(200, t.string),
 * )
 *
 * const healthz = promiseHandler(healthzRoute,
 *   () => Promise.resolve(respond(200,"great job"))
 * )
 *
 */
export const promiseHandler = <
  ResponseInput extends {
    code: number
    data: unknown
  },
  ResponseOutput extends {
    code: number
    data: unknown
  },
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
  >,
  promiseHandler: PromiseHandler<
    ResponseInput,
    Param,
    Query,
    Data,
    Headers
  >
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
})

/**
 * Takes a route and a matching handler, that returns the result as a regular value. Note that if an error is thrown
 * in the handler then all bets are off with type safety. If you would like more certainty around error types then you
 * should look into one of the `fp-ts` handler variants above
 *
 * @example
 * const healthzRoute = makeRoute(
 *   get,
 *   lit('healthz'),
 *   response(200, t.string),
 * )
 *
 * const healthz = pureHandler(healthzRoute,
 *   () => respond(200,"great job")
 * )
 *
 */
export const pureHandler = <
  ResponseInput extends {
    code: number
    data: unknown
  },
  ResponseOutput extends {
    code: number
    data: unknown
  },
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
  >,
  pureHandler: PureHandler<
    ResponseInput,
    Param,
    Query,
    Data,
    Headers
  >
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
})

/**
 * Takes a route and a matching handler, that returns the result inside an `fp-ts` `Either`.
 *
 * @example
 * const userRoute = makeRoute(
 *   get,
 *   lit('user'),
 *   param('id',tt.NumberFromString),
 *   response(200, t.string),
 *   response(400, t.string),
 * )
 *
 * const healthz = eitherHandler(userRoute,
 *   ({ params: { id }}) =>
 *      id === 42
 *       ? E.right(respond(200,"great job"))
 *       : E.left(respond(400,"big error"))
 * )
 *
 */
export const eitherHandler = <
  ResponseInput extends {
    code: number
    data: unknown
  },
  ResponseOutput extends {
    code: number
    data: unknown
  },
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
  >,
  eitherHandler: EitherHandler<
    ResponseInput,
    Param,
    Query,
    Data,
    Headers
  >
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
  handler: flow(
    eitherHandler,
    E.fold(
      (e) => T.of(e) as T.Task<ResponseInput>,
      (a) => T.of(a) as T.Task<ResponseInput>
    )
  ),
})
