import { OpenAPIV3 } from 'openapi-types'
import * as A from 'fp-ts/Apply'
import * as SE from 'fp-ts-contrib/StateEither'
import { Metadata } from '../Encoder'
import * as t from 'io-ts'

export const sequenceS = A.sequenceS(SE.stateEither)

export const nameIsDeliberate = (name: string): boolean =>
  !name.includes('{') &&
  name !== 'string' &&
  name !== 'number' &&
  name !== 'boolean'

export const createObjectSchema = (properties: {
  [x: string]:
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.ReferenceObject
}): OpenAPIV3.SchemaObject => ({
  type: 'object',
  properties,
})

export const createReferenceSchema = (
  schemaName: string
): OpenAPIV3.ReferenceObject => ({
  $ref: `#/components/schemas/${schemaName}`,
})

export const getSchemaName = (
  metadata: Metadata,
  encoder: t.InterfaceType<any>
): string => {
  if (metadata.schemaName) {
    return metadata.schemaName
  }
  // get name from .data inside encoder
  const encoderName =
    encoder?._tag === 'InterfaceType' &&
    encoder.props?.data?.name

  if (encoderName && nameIsDeliberate(encoderName)) {
    return encoderName
  }
  return 'NamelessSchema'
}

// return the specified description if provided, if not return some standard
// HTTP code descriptions
// TODO: get all the proper names for these from Wiki or sutin and use those
export const statusCodeDescription = (
  code: number,
  metadata: Metadata
): string => {
  if (metadata.description) {
    return metadata.description
  }
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
