import { OpenAPIV3 } from 'openapi-types'
import { pipe } from 'fp-ts/function'
import * as SE from 'fp-ts-contrib/StateEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'

import { AnyRouteWithHandler } from '../types/Handler'
import { Router, RouterMetadata } from '../types/Router'
import { Encoder } from '../types/Encoder'
import { showRouteItems } from '../types/RouteItem'

import {
  OpenAPIState,
  OpenAPIM,
  PathItem,
  toEither,
  initialState,
  pure,
  throwError,
  sequenceStateEitherArray,
  sequenceT,
  NamedSchema,
} from './types'
import {
  getRequestBodyType,
  getRouteResponses,
} from './io-ts'

export { withEncoder, getRouteResponses } from './io-ts'

export const createOpenAPISpec = (
  router: Router
): E.Either<string, OpenAPIV3.Document> =>
  pipe(
    sequenceStateEitherArray(
      router.routeHandlers.map((rwh) =>
        getPathItemForRoute(
          rwh.route,
          rwh.route.responseEncoder
        )
      )
    ),
    (se) => toEither(se, initialState),
    E.map(createOpenAPIDocument(router.metadata))
  )

const openAPIInfo = (
  metadata: Partial<RouterMetadata>
): OpenAPIV3.InfoObject => ({
  title: metadata.title || 'My API',
  description: metadata.description || 'My service',
  version: metadata.version || '1.0.0',
})

const createOpenAPIDocument = (
  metadata: Partial<RouterMetadata>
) => ([pathItems, { schemas }]: [
  PathItem[],
  OpenAPIState
]): OpenAPIV3.Document =>
  ({
    openapi: '3.0.0',
    info: openAPIInfo(metadata),
    paths: resultsToPaths(pathItems),
    components: {
      schemas: schemas.reduce(combineSchemas, {}),
    },
  } as OpenAPIV3.Document)

const combineSchemas = (
  all: OpenAPIV3.ComponentsObject,
  schema: NamedSchema
): OpenAPIV3.ComponentsObject => ({
  ...all,
  [schema.name]: schema.schema,
})

const resultsToPaths = (
  pathItems: PathItem[]
): OpenAPIV3.Document['paths'] =>
  pathItems.reduce((obj, { url, pathItem }) => {
    const currentItems = obj[url] || {}
    const newPathItem = { ...currentItems, ...pathItem }
    return {
      ...obj,
      [url]: newPathItem,
    }
  }, {} as OpenAPIV3.Document['paths'])

const getPathDescription = (
  route: AnyRouteWithHandler['route']
): string => route.description.join('\n')

const getPathSummary = (
  route: AnyRouteWithHandler['route']
): string =>
  route.summary.length > 0
    ? route.summary.join('\n')
    : showRouteItems(route.parts)

const getHttpMethod = (
  route: AnyRouteWithHandler['route']
): OpenAPIM<string> =>
  // eslint-disable-next-line no-underscore-dangle
  route.method._tag === 'Some'
    ? pure(route.method.value.toLowerCase())
    : throwError('Route has no HTTP method')

const getRequestBody = (
  route: AnyRouteWithHandler['route']
): OpenAPIM<O.Option<OpenAPIV3.RequestBodyObject>> =>
  route.dataDecoder.type === 'Decoder'
    ? pipe(
        getRequestBodyType(route.dataDecoder.decoder),
        SE.map(O.some)
      )
    : pure(O.none)

export const getPathItemForRoute = (
  route: AnyRouteWithHandler['route'],
  responseEncoder: Encoder<any, any>
): OpenAPIM<PathItem> =>
  pipe(
    sequenceT(
      responseEncoder.type === 'Encoder'
        ? getRouteResponses(
            responseEncoder.encoder,
            responseEncoder.metadata
          )
        : throwError('No response decoder'),
      getHttpMethod(route),
      getRequestBody(route)
    ),
    SE.map(([responses, method, requestBody]) => ({
      url: showRouteItems(route.parts),
      pathItem: {
        [method]: {
          description: getPathDescription(route),
          summary: getPathSummary(route),
          responses,
          requestBody: O.toUndefined(requestBody),
        },
      },
    }))
  )
