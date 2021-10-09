import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import { pipe } from 'fp-ts/function'
import {
  addSchema,
  OpenAPIM,
  pure,
  sequenceStateEitherArray,
} from './types'
import * as SE from 'fp-ts-contrib/StateEither'
import {
  nameIsDeliberate,
  statusCodeDescription,
  sequenceS,
  createReferenceSchema,
  createObjectSchema,
  getSchemaName,
} from './helpers'
import { MetadataByStatusCode } from '../Encoder'

const withInterfaceType = (
  encoder: t.InterfaceType<any, any, any, any>
): OpenAPIM<
  OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
> =>
  pipe(
    sequenceS(
      Object.keys(encoder.props)
        .map<[string, OpenAPIM<any>]>((key) => [
          key,
          withDecoder(encoder.props[key]),
        ])
        .reduce(
          (as, [key, val]) => ({ ...as, [key]: val }),
          {} as Record<
            string,
            OpenAPIM<
              | OpenAPIV3.SchemaObject
              | OpenAPIV3.ReferenceObject
            >
          >
        )
    ),
    SE.map(createObjectSchema),
    SE.chain((schema) =>
      nameIsDeliberate(encoder.name)
        ? pipe(
            addSchema({
              name: encoder.name,
              schema: schema,
            }),
            SE.map(() =>
              createReferenceSchema(encoder.name)
            )
          )
        : pure<
            | OpenAPIV3.SchemaObject
            | OpenAPIV3.ReferenceObject
          >(schema)
    )
  )

const withRefinementType = (
  encoder: t.RefinementType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> => {
  switch (encoder.name) {
    case 'Int':
      return pure({ type: 'integer' })
  }
  return SE.left(
    `Could not find refinement type for "${encoder.name}"`
  )
}

const withArrayType = (
  encoder: t.ArrayType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pipe(
    withDecoder(encoder.type),
    SE.map((inner) => ({ type: 'array', items: inner }))
  )

// take a encoder and return it's main type and any additional schemas in State
export const withDecoder = (
  encoder: t.Type<any>
): OpenAPIM<
  OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
> => {
  if (encoder instanceof t.InterfaceType) {
    return withInterfaceType(encoder)
  } else if (encoder instanceof t.StringType) {
    return pure({ type: 'string' })
  } else if (encoder instanceof t.BooleanType) {
    return pure({ type: 'boolean' })
  } else if (encoder instanceof t.NumberType) {
    return pure({ type: 'number' })
  } else if (encoder instanceof t.RefinementType) {
    return withRefinementType(encoder)
  } else if (encoder instanceof t.ArrayType) {
    return withArrayType(encoder)
  }
  return SE.left('No encoder found')
}

// take apart an interface object, which should be of the form
// { code: number, data: SomeResultType }
const interfaceObject = (
  encoder: t.InterfaceType<any>,
  metadataByStatusCode: MetadataByStatusCode
): OpenAPIM<OpenAPIV3.ResponsesObject> => {
  const statusCode =
    encoder?._tag === 'InterfaceType'
      ? encoder.props?.code?.value
      : 0

  const metadata = metadataByStatusCode[statusCode] || {}

  const schemaName = getSchemaName(metadata, encoder)

  const data: OpenAPIV3.ResponseObject = {
    description: statusCodeDescription(
      statusCode,
      metadata
    ),
    content: {
      'application/json': {
        schema: createReferenceSchema(schemaName),
      },
    },
  }

  const responses: OpenAPIV3.ResponsesObject = {
    [statusCode]: data,
  }

  return pipe(
    encoder.props?.data
      ? withDecoder(encoder.props.data)
      : SE.left('No encoder props'),

    SE.chain((dataType) =>
      !('$ref' in dataType) // don't save reference schemas
        ? addSchema({
            name: schemaName,
            schema: dataType,
          })
        : pure(undefined)
    ),

    SE.map(() => responses)
  )
}

export const getRouteResponses = (
  encoder: t.Type<any>,
  metadataByStatusCode: MetadataByStatusCode
): OpenAPIM<OpenAPIV3.ResponsesObject> => {
  if (encoder instanceof t.InterfaceType) {
    return interfaceObject(encoder, metadataByStatusCode)
  }

  if (
    encoder instanceof t.UnionType ||
    encoder instanceof t.TaggedUnionType
  ) {
    return pipe(
      sequenceStateEitherArray<OpenAPIV3.ResponsesObject>(
        encoder.types.map((enc: t.Type<any>) =>
          getRouteResponses(enc, metadataByStatusCode)
        )
      ),
      SE.map((responses) =>
        responses.reduce((as, a) => ({ ...as, ...a }), {})
      )
    )
  }

  const tag =
    '_tag' in encoder
      ? (encoder as any)._tag
      : 'type with no _tag'

  return SE.left(
    `Response type expected to be interface or union type but instead got ${tag}`
  )
}
