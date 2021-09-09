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
  rwh: AnyHandler
): E.Either<string, OpenAPIV3.Document> => {
  const x = pipe(
    toEither(
      pathItemForRoute(
        rwh.route,
        rwh.route.responseEncoder
      ),
      initialState
    ),
    E.map(
      ([{ url, pathItem }, { schemas }]) =>
        ({
          openapi: '3.0.0',
          info: { title: 'My API', version: '1.0.0' },
          paths: {
            [url]: pathItem,
          },
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
