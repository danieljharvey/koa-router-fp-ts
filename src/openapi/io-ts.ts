import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import { addSchema, OpenAPIM, pure } from './types'
import * as SE from 'fp-ts-contrib/StateEither'
import {
  nameIsDeliberate,
  statusCodeDescription,
  sequenceS,
  createReferenceSchema,
  createObjectSchema,
} from './helpers'

const withInterfaceType = (
  decoder: t.InterfaceType<any, any, any, any>
): OpenAPIM<
  OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
> =>
  pipe(
    sequenceS(
      Object.keys(decoder.props)
        .map<[string, OpenAPIM<any>]>((key) => [
          key,
          withDecoder(decoder.props[key]),
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
    SE.chain((schema) => {
      console.log('withInterfaceType', { decoder, schema })
      return nameIsDeliberate(decoder.name)
        ? pipe(
            addSchema({
              name: decoder.name,
              schema: schema,
            }),
            SE.map(() =>
              createReferenceSchema(decoder.name)
            )
          )
        : pure<
            | OpenAPIV3.SchemaObject
            | OpenAPIV3.ReferenceObject
          >(schema)
    })
  )

const withRefinementType = (
  decoder: t.RefinementType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> => {
  switch (decoder.name) {
    case 'Int':
      return pure({ type: 'integer' })
  }
  return SE.left(
    `Could not find refinement type for "${decoder.name}"`
  )
}

const withArrayType = (
  decoder: t.ArrayType<any>
): OpenAPIM<OpenAPIV3.SchemaObject> =>
  pipe(
    withDecoder(decoder.type),
    SE.map((inner) => ({ type: 'array', items: inner }))
  )

// take a decoder and return it's main type and any additional schemas in State
export const withDecoder = (
  decoder: t.Type<any>
): OpenAPIM<
  OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
> => {
  if (decoder instanceof t.InterfaceType) {
    return withInterfaceType(decoder)
  } else if (decoder instanceof t.StringType) {
    return pure({ type: 'string' })
  } else if (decoder instanceof t.BooleanType) {
    return pure({ type: 'boolean' })
  } else if (decoder instanceof t.NumberType) {
    return pure({ type: 'number' })
  } else if (decoder instanceof t.RefinementType) {
    return withRefinementType(decoder)
  } else if (decoder instanceof t.ArrayType) {
    return withArrayType(decoder)
  }
  return SE.left('No decoder found')
}

export const responsesObject = (
  decoder: any // t.Type<any>
): OpenAPIM<OpenAPIV3.ResponsesObject> => {
  if (decoder?._tag === 'InterfaceType') {
    const code =
      decoder?._tag === 'InterfaceType'
        ? decoder.props?.code?.value
        : 0
    const dataType = decoder.props?.data
      ? withDecoder(decoder.props.data)
      : O.none
    const data = {
      description:
        decoder.name || statusCodeDescription(code),
    }

    const responses: OpenAPIV3.ResponsesObject = {
      [code]: data,
    }

    return pipe(
      decoder.props?.data
        ? withDecoder(decoder.props.data)
        : SE.left('No decoder props'),

      SE.chain((dataType) =>
        addSchema({
          name: decoder.name || statusCodeDescription(code),
          schema: dataType,
        })
      ),

      SE.map(() => responses)
    )
  }
  return SE.left('Not an interface')
}
