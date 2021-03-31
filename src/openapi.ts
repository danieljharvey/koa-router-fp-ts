import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import { RouteWithHandler } from './Handler'
import { Route } from './Route'
import { showRouteItems } from './RouteItem'

type AnyHandler = RouteWithHandler<any, any, any, any, any>

export const createOpenAPISpec = (
  rwh: AnyHandler
): OpenAPIV3.Document => {
  const [key, val] = pathItemForRoute(
    rwh.route,
    rwh.responseDecoder
  )

  const x: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0' },
    paths: {
      [key]: val,
    },
  }

  return x
}

export const responsesObject = (
  decoder: any
): OpenAPIV3.ResponsesObject => {
  const code =
    decoder?._tag === 'InterfaceType'
      ? decoder.props?.code?.value
      : 0
  const data = {
    description:
      code === 200 ? 'Successful request' : 'Failed',
  }
  return { [code]: data }
}

export const pathItemForRoute = (
  route: Route,
  responseDecoder: t.Type<any, any, any>
): [string, OpenAPIV3.PathItemObject<{}>] => {
  return [
    showRouteItems(route.parts),

    {
      get: {
        description: 'route info',
        responses: responsesObject(responseDecoder),
      },
    },
  ]
}
