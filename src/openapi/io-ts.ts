import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import { pipe } from 'fp-ts/function'
import * as SE from 'fp-ts-contrib/StateEither'
import * as NE from 'fp-ts/NonEmptyArray'
import * as O from 'fp-ts/Option'

import { MetadataByStatusCode } from '../types/Encoder'

import {
  addSchema,
  OpenAPIM,
  pure,
  sequenceStateEitherArray,
} from './types'
import {
  nameIsDeliberate,
  statusCodeDescription,
  sequenceS,
  createReferenceSchema,
  createObjectSchema,
  getSchemaName,
} from './helpers'

type SchemaOrReference =
  | OpenAPIV3.SchemaObject
  | OpenAPIV3.ReferenceObject

const withInterfaceType = (
  encoder: t.InterfaceType<any>
): OpenAPIM<SchemaOrReference> =>
  withRecordType(
    encoder.props,
    encoder.name,
    Object.keys(encoder.props)
  )

const withPartialType = (
  encoder: t.PartialType<any>
): OpenAPIM<SchemaOrReference> =>
  withRecordType(encoder.props, encoder.name, [])

const withRecordType = (
  props: Record<string, t.Type<any>>,
  name: string,
  requiredKeys: string[]
): OpenAPIM<SchemaOrReference> =>
  pipe(
    sequenceS(
      Object.keys(props)
        .map<[string, OpenAPIM<any>]>((key) => [
          key,
          withEncoder(props[key]),
        ])
        .reduce(
          (as, [key, val]) => ({ ...as, [key]: val }),
          {} as Record<string, OpenAPIM<SchemaOrReference>>
        )
    ),
    SE.map((items) =>
      createObjectSchema(items, requiredKeys)
    ),
    SE.chain((schema) =>
      nameIsDeliberate(name)
        ? pipe(
            addSchema({
              name,
              schema,
            }),
            SE.map(() => createReferenceSchema(name))
          )
        : pure<SchemaOrReference>(schema)
    )
  )

type Pair<A, B> = { a: A; b: B }

const splitPairs = <A, B>(
  pairs: Pair<A, B>[]
): Pair<A[], B[]> => {
  const empty: Pair<A[], B[]> = { a: [], b: [] }

  return pairs.reduce(
    (total, pair) => ({
      a: [...total.a, pair.a],
      b: [...total.b, pair.b],
    }),
    empty
  )
}

const withIntersectionType = (
  encoder: t.IntersectionType<any[]>
): OpenAPIM<SchemaOrReference> => {
  const withIntersectionItem = (
    item: t.Type<unknown>
  ): Pair<Record<string, t.Type<any>>, string[]> => {
    const tag = getTag(item)
    if (tag === 'InterfaceType') {
      const encoder = item as t.InterfaceType<any>
      return {
        a: encoder.props,
        b: Object.keys(encoder.props),
      }
    }
    if (tag === 'PartialType') {
      const encoder = item as t.PartialType<any>
      return { a: encoder.props, b: [] }
    }
    return { a: {}, b: [] }
  }
  return pipe(
    encoder.types.map(withIntersectionItem),
    (items) => {
      const { a: types, b: requiredKeys } = splitPairs(
        items
      )

      const allTypes: Record<
        string,
        t.Type<any>
      > = types.reduce((all, a) => ({ ...all, ...a }), {})

      return withRecordType(
        allTypes,
        encoder.name,
        requiredKeys.flatMap((a) => a)
      )
    }
  )
}

// Need to add more of these as we find them
const withRefinementType = (
  encoder: t.RefinementType<any>
): OpenAPIM<SchemaOrReference> => {
  // if there is a more refined OpenAPI type than TS basic type, include it in this case match...
  switch (encoder.name) {
    case 'Int':
      return pure({ type: 'integer' })
    default:
      // if not, the refinement type is based on a more concrete type and we should return the type for that
      return withEncoder(encoder.type)
  }
}

const withArrayType = (
  encoder: t.ArrayType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pipe(
    withEncoder(encoder.type),
    SE.map((inner) => ({ type: 'array', items: inner }))
  )

// sometimes enums are expressed t.union([t.literal('one'),t.literal('two')])
// etc
// when we see this, return the enum values
const literalsToEnum = (
  matchType: string,
  types: t.Type<any>[]
) =>
  NE.fromArray(
    types.reduce((enumValues, encoder) => {
      if (
        getTag(encoder) === 'LiteralType' &&
        typeof (encoder as t.LiteralType<any>).value ===
          matchType
      ) {
        return [
          ...enumValues,
          `${(encoder as t.LiteralType<any>).value}`,
        ]
      }
      // if the expression type doesn't match `matchType`, bin them all off
      return []
    }, [] as string[])
  )

// With union types we first see if they are actually enums expressed using
// a t.union packed full of t.literal values. If they are, we return a OpenAPI
// `enum`, if not, a regular object with multiple options using `oneOf`
export const withUnionType = (
  encoder: t.UnionType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> => {
  const x = pipe(
    literalsToEnum('string', encoder.types),
    O.alt(() => literalsToEnum('number', encoder.types)),
    O.alt(() => literalsToEnum('boolean', encoder.types)),
    O.map((enumStrings) =>
      pure({
        type: 'string',
        enum: enumStrings,
      } as OpenAPIV3.SchemaObject)
    ),
    O.getOrElse(() =>
      pipe(
        encoder.types.map(withEncoder),
        sequenceStateEitherArray,
        SE.map(
          (schemas) =>
            ({
              type: 'object',
              oneOf: schemas,
            } as OpenAPIV3.SchemaObject)
        )
      )
    )
  )

  return x
}

const withKeyofType = (
  encoder: t.KeyofType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pure({ type: 'string', enum: Object.keys(encoder.keys) })

// unsure if this is the best encoding here
const withNullType = (
  _encoder: t.NullType
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pure({ type: 'object', nullable: true })

// unsure if this is the best encoding here
const withUndefinedType = (
  _encoder: t.UndefinedType
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pure({ type: 'object', nullable: true })

// unsure if this is the best encoding here
const withUnknownType = (
  _encoder: t.UnknownType
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pure({ type: 'object' })

// take a encoder and return it's main type and any additional schemas in State
export const withEncoder = (
  encoder: t.Type<any>
): OpenAPIM<SchemaOrReference> => {
  switch (getTag(encoder)) {
    case 'InterfaceType':
      return withInterfaceType(
        encoder as t.InterfaceType<any>
      )
    case 'StringType':
      return pure({ type: 'string' })
    case 'BooleanType':
      return pure({ type: 'boolean' })
    case 'NumberType':
      return pure({ type: 'number' })
    case 'RefinementType':
      return withRefinementType(
        encoder as t.RefinementType<any>
      )
    case 'ArrayType':
      return withArrayType(encoder as t.ArrayType<any>)
    case 'UnionType':
      return withUnionType(encoder as t.UnionType<any>)
    case 'LiteralType':
      return withLiteralType(encoder as t.LiteralType<any>)
    case 'PartialType':
      return withPartialType(encoder as t.PartialType<any>)
    case 'IntersectionType':
      return withIntersectionType(
        encoder as t.IntersectionType<any>
      )
    case 'KeyofType':
      return withKeyofType(encoder as t.KeyofType<any>)
    case 'NullType':
      return withNullType(encoder as t.NullType)
    case 'UndefinedType':
      return withUndefinedType(encoder as t.UndefinedType)
    case 'UnknownType':
      return withUnknownType(encoder as t.UnknownType)

    default:
      // last ditch attempt to match custom types
      return encoderFromName(encoder.name)
  }
}

const withLiteralType = (
  encoder: t.LiteralType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> => {
  switch (typeof encoder.value) {
    case 'string':
      return pure({
        type: 'string',
        example: `${encoder.value}`,
      })
    case 'number':
      return pure({
        type: 'number',
        example: `${encoder.value}`,
      })
    case 'boolean':
      return pure({
        type: 'boolean',
        example: `${encoder.value}`,
      })
    default:
      return SE.left(
        `Cannot deduce type of literal value: ${encoder.value}`
      )
  }
}

const encoderFromName = (
  name: string
): OpenAPIM<SchemaOrReference> => {
  switch (name) {
    case 'BigIntFromString':
    case 'BooleanFromString':
    case 'NumberFromString':
    case 'DateFromISOString':
    case 'IntFromString':
    case 'JsonFromString':
    case 'RegExp':
      return pure({ type: 'string' })
    case 'BooleanFromNumber':
    case 'DateFromNumber':
    case 'DateFromUnixTime':
    case 'Decimal':
      return pure({ type: 'number' })
    case 'Date':
      return pure({ type: 'string', format: 'date' })
    default:
      return SE.left(`No encoder found for ${name}`)
  }
}

// take apart an interface object, which should be of the form
// { code: number, data: SomeResultType }
const getResponsesFromInterface = (
  encoder: t.InterfaceType<any>,
  metadataByStatusCode: MetadataByStatusCode
): OpenAPIM<OpenAPIV3.ResponsesObject> => {
  const statusCode =
    // eslint-disable-next-line no-underscore-dangle
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
      ? withEncoder(encoder.props.data)
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
  const tag = getTag(encoder)
  if (tag === 'InterfaceType') {
    return getResponsesFromInterface(
      encoder as t.InterfaceType<any>,
      metadataByStatusCode
    )
  }

  if (tag === 'UnionType') {
    return pipe(
      sequenceStateEitherArray<OpenAPIV3.ResponsesObject>(
        (encoder as t.UnionType<any>).types.map(
          (enc: t.Type<any>) =>
            getRouteResponses(enc, metadataByStatusCode)
        )
      ),
      SE.map((responses) =>
        responses.reduce((as, a) => ({ ...as, ...a }), {})
      )
    )
  }

  return SE.left(
    `Response type expected to be interface or union type but instead got ${getTag(
      encoder
    )}`
  )
}

const getTag = (codec: t.Type<any>): string =>
  '_tag' in codec
    ? // eslint-disable-next-line no-underscore-dangle
      (codec as any)._tag
    : ''

// given a decoder for some post data, return a RequestBodyObject, as well as
// pushing any Schemas into state for later output
export const getRequestBodyType = (
  decoder: t.Type<any>
): OpenAPIM<OpenAPIV3.RequestBodyObject> =>
  getTag(decoder) === 'InterfaceType'
    ? pipe(
        withInterfaceType(decoder as t.InterfaceType<any>),
        SE.map((response) => ({
          content: {
            'application/json': {
              schema: response,
            },
          },
        }))
      )
    : SE.left(
        `Request body type expected to be interface type but instead got ${getTag(
          decoder
        )}`
      )
