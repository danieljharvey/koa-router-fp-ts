import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import { RouteWithHandler } from '../Handler'
import { Route } from '../Route'
import { showRouteItems } from '../RouteItem'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import * as A from 'fp-ts/Apply'
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

const sequenceS = A.sequenceS(O.option)

const withInterfaceType = (
  decoder: t.InterfaceType<any, any, any, any>
): O.Option<OpenAPIV3.SchemaObject> =>
  pipe(
    sequenceS(
      Object.keys(decoder.props)
        .map<[string, O.Option<any>]>(key => [
          key,
          withDecoder(decoder.props[key]),
        ])
        .reduce(
          (as, [key, val]) => ({ ...as, [key]: val }),
          {} as Record<
            string,
            O.Option<OpenAPIV3.SchemaObject>
          >
        )
    ),
    O.map(properties => ({ type: 'object', properties }))
  )

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

type ResponseObject = {
  responses: OpenAPIV3.ResponsesObject
  namedSchemas: NamedSchema[]
}

const withRefinementType = (
  decoder: t.RefinementType<any>
): O.Option<OpenAPIV3.SchemaObject> => {
  switch (decoder.name) {
    case 'Int':
      return O.some({ type: 'integer' })
  }
  return O.none
}

const withArrayType = (
  decoder: t.ArrayType<any>
): O.Option<OpenAPIV3.SchemaObject> =>
  pipe(
    withDecoder(decoder.type),
    O.map(inner => ({ type: 'array', items: inner }))
  )

export const withDecoder = (
  decoder: t.Type<any>
): O.Option<OpenAPIV3.SchemaObject> => {
  if (decoder instanceof t.InterfaceType) {
    return withInterfaceType(decoder)
  } else if (decoder instanceof t.StringType) {
    return O.some({ type: 'string' })
  } else if (decoder instanceof t.BooleanType) {
    return O.some({ type: 'boolean' })
  } else if (decoder instanceof t.NumberType) {
    return O.some({ type: 'number' })
  } else if (decoder instanceof t.RefinementType) {
    return withRefinementType(decoder)
  } else if (decoder instanceof t.ArrayType) {
    return withArrayType(decoder)
  }
  return O.none
}

export const responsesObject = (
  decoder: any // t.Type<unknown, unknown, unknown>
): ResponseObject => {
  if (decoder?._tag === 'InterfaceType') {
    const code =
      decoder?._tag === 'InterfaceType'
        ? decoder.props?.code?.value
        : 0
    const dataType = decoder.props?.data
      ? withDecoder(decoder.props.data)
      : O.none
    const data = {
      description: statusCodeDescription(code),
    }
    return {
      responses: { [code]: data },
      namedSchemas: O.isSome(dataType)
        ? [
            {
              name: statusCodeDescription(code),
              schema: dataType.value,
            },
          ]
        : [],
    }
  }
  return {
    responses: {},
    namedSchemas: [],
  }
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
  const { responses, namedSchemas } = responsesObject(
    responseDecoder
  )
  return {
    url: showRouteItems(route.parts),
    schemas: namedSchemas,
    pathItem: {
      get: {
        description: 'route info',
        responses,
      },
    },
  }
}
