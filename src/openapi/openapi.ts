import { OpenAPIV3 } from 'openapi-types'
import { RouteWithHandler } from '../Handler'
import { Encoder } from '../Encoder'
import { showRouteItems } from '../RouteItem'
import { pipe } from 'fp-ts/function'
import {
  OpenAPIM,
  PathItem,
  toEither,
  initialState,
  pure,
  throwError,
  sequenceStateEitherArray,
  sequenceT,
} from './types'
import * as SE from 'fp-ts-contrib/StateEither'
import * as E from 'fp-ts/Either'
import { responsesObject } from './io-ts'
export { withDecoder, responsesObject } from './io-ts'

type AnyHandler = RouteWithHandler<
  any,
  any,
  any,
  any,
  any,
  any
>

export const createOpenAPISpec = (
  handlers: AnyHandler[]
): E.Either<string, OpenAPIV3.Document> => {
  const x = pipe(
    sequenceStateEitherArray(
      handlers.map((rwh) =>
        pathItemForRoute(
          rwh.route,
          rwh.route.responseEncoder
        )
      )
    ),
    (se) => toEither(se, initialState),
    E.map(
      ([pathItems, { schemas }]) =>
        ({
          openapi: '3.0.0',
          info: { title: 'My API', version: '1.0.0' },
          paths: resultsToPaths(pathItems),
          components: {
            schemas: schemas.reduce(
              (as, a) => ({ ...as, [a.name]: a.schema }),
              {}
            ),
          },
        } as OpenAPIV3.Document)
    )
  )

  return x
}

const resultsToPaths = (
  pathItems: PathItem[]
): OpenAPIV3.Document['paths'] =>
  pathItems.reduce(
    (obj, { url, pathItem }) => ({
      ...obj,
      [url]: pathItem,
    }),
    {} as OpenAPIV3.Document['paths']
  )

const getPathDescription = (
  route: AnyHandler['route']
): string => route.description.join('\n')

const getHttpMethod = (
  route: AnyHandler['route']
): OpenAPIM<string> =>
  route.method._tag === 'Some'
    ? pure(route.method.value.toLowerCase())
    : throwError('Route has no HTTP method')

export const pathItemForRoute = (
  route: AnyHandler['route'],
  responseEncoder: Encoder<any, any>
): OpenAPIM<PathItem> =>
  pipe(
    sequenceT(
      responseEncoder.type === 'Encoder'
        ? responsesObject(responseEncoder.encoder)
        : throwError('No response decoder'),
      getHttpMethod(route)
    ),
    SE.map(([responses, method]) => ({
      url: showRouteItems(route.parts),
      pathItem: {
        [method]: {
          description: getPathDescription(route),
          responses,
        },
      },
    }))
  )
