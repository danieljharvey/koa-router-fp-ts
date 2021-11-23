import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/lib/function'

import { MatchInputs, matchRoute } from './matchRoute'
import {
  MatchError,
  MatchValidationError,
  noResponseValidator,
} from './types/MatchError'
import { RouteWithHandler } from './types/Handler'
import * as Enc from './types/Encoder'

export const runRouteWithHandler = <
  ResponseInput extends { code: number; data: unknown },
  ResponseOutput extends { code: number; data: unknown },
  Param,
  Query,
  Data,
  Headers
>(
  routeWithHandler: RouteWithHandler<
    ResponseInput,
    ResponseOutput,
    Param,
    Query,
    Data,
    Headers
  >
): ((
  inputs: MatchInputs
) => TE.TaskEither<
  MatchError,
  E.Either<MatchValidationError, ResponseOutput>
>) =>
  flow(
    matchRoute(routeWithHandler.route),
    TE.fromEither,
    TE.chain((matchedRoute) =>
      TE.fromTask(routeWithHandler.handler(matchedRoute))
    ),
    TE.chainEitherKW(
      serialiseResponse(
        routeWithHandler.route.responseEncoder
      )
    ),
    TE.map(E.right),
    TE.orElseW((e) =>
      e.type === 'NoMatchError'
        ? TE.left(e)
        : TE.right(E.left(e))
    )
  )

// serialise response
const serialiseResponse = <ResponseInput, ResponseOutput>(
  responseEncoder: Enc.Encoder<
    ResponseInput,
    ResponseOutput
  >
) => (
  resp: ResponseInput
): E.Either<MatchError, ResponseOutput> =>
  responseEncoder.type === 'Encoder'
    ? pipe(resp, responseEncoder.encoder.encode, E.right)
    : E.left(noResponseValidator() as MatchError)
