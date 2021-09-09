import { OpenAPIV3 } from 'openapi-types'
import { RouteWithHandler } from '../Handler'
import { Decoder } from '../Decoder'
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

type AnyHandler = RouteWithHandler<any, any, any, any, any>

export const createOpenAPISpec = (
  rwh: AnyHandler
): E.Either<string, OpenAPIV3.Document> => {
  const x = pipe(
    toEither(
      pathItemForRoute(
        rwh.route,
        rwh.route.responseDecoder
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
  responseDecoder: Decoder<any>
): OpenAPIM<PathItem> =>
  pipe(
    responseDecoder.type === 'Decoder'
      ? responsesObject(responseDecoder.decoder)
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
