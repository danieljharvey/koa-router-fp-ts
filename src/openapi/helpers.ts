import { OpenAPIV3 } from 'openapi-types'
import * as A from 'fp-ts/Apply'
import * as SE from 'fp-ts-contrib/StateEither'

export const sequenceS = A.sequenceS(SE.stateEither)

export const nameIsDeliberate = (name: string): boolean =>
  !name.includes('{')

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

export const statusCodeDescription = (
  code: number
): string => {
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
