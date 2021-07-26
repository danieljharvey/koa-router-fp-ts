import { MatchInputs, matchRoute } from './matchRoute'
import {
  MatchError,
  NoMatchError,
  MatchValidationError,
  noResponseValidator,
  validationError,
} from './MatchError'
import { RouteWithHandler } from './Handler'
import * as D from './Decoder'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/lib/function'

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
  E.Either<MatchValidationError, ResponseType>
>) => {
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
    ),
    TE.map(E.right),
    TE.orElseW((e) =>
      e.type === 'NoMatchError'
        ? TE.left(e)
        : TE.right(E.left(e))
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
