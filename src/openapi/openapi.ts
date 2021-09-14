import { OpenAPIV3 } from 'openapi-types'
import { RouteWithHandler } from '../Handler'
import { Encoder } from '../Encoder'
import { showRouteItems } from '../RouteItem'
import { pipe } from 'fp-ts/function'
import * as Arr from 'fp-ts/Array'
import {
  OpenAPIM,
  PathItem,
  toEither,
  initialState,
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

const sequenceStateEitherArray = Arr.sequence(
  SE.Applicative
)

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

export const pathItemForRoute = (
  route: AnyHandler['route'],
  responseEncoder: Encoder<any, any>
): OpenAPIM<PathItem> =>
  pipe(
    responseEncoder.type === 'Encoder'
      ? responsesObject(responseEncoder.encoder)
      : SE.left('No response decoder'),
    SE.map((responses) => ({
      url: showRouteItems(route.parts),
      pathItem: {
        get: {
          description: 'Generic route info',
          responses,
        },
      },
    }))
  )
