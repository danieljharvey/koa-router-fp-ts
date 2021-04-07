import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import { RouteWithHandler } from '../Handler'
import { Route } from '../Route'
import { showRouteItems } from '../RouteItem'

type AnyHandler = RouteWithHandler<any, any, any, any, any>

export const createOpenAPISpec = (
  rwh: AnyHandler
): OpenAPIV3.Document => {
  const { url, pathItem, schemas } = pathItemForRoute(
    rwh.route,
    rwh.responseDecoder
  )

  const x: OpenAPIV3.Document = {
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
  }

  return x
}

//    type SchemaObject = ArraySchemaObject | NonArraySchemaObject;

const decoderToSchema = (
  decoder: t.Type<unknown, unknown, unknown>
) => {
  console.log(decoder)
}

const statusCodeDescription = (code: number): string => {
  if (code >= 200 && code < 300) {
    return 'Success'
  } else if (code >= 300 && code < 400) {
    return 'Moved or something'
  } else if (code >= 400 && code < 500) {
    return 'User error'
  } else if (code >= 500 && code < 600) {
    return 'Internal error'
  }
  return ''
}
export const responsesObject = (
  decoder: any
): [OpenAPIV3.ResponsesObject, NamedSchema[]] => {
  const code =
    decoder?._tag === 'InterfaceType'
      ? decoder.props?.code?.value
      : 0
  const data = {
    description: statusCodeDescription(code),
  }
  return [{ [code]: data }, []]
}

type PathItem = {
  url: string
  pathItem: OpenAPIV3.PathItemObject<{}>
  schemas: NamedSchema[]
}

type NamedSchema = {
  name: string
  schema: OpenAPIV3.SchemaObject
}

export const pathItemForRoute = (
  route: Route,
  responseDecoder: t.Type<any, any, any>
): PathItem => {
  const [responses, schemas] = responsesObject(
    responseDecoder
  )
  return {
    url: showRouteItems(route.parts),
    schemas,
    pathItem: {
      get: {
        description: 'route info',
        responses,
      },
    },
  }
}
