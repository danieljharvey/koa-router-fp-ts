import * as t from 'io-ts'

export type Metadata = {
  description?: string
  schemaName?: string
}

export type MetadataByStatusCode = Record<string, Metadata>

export type WithEncoder<Input, Output> = {
  type: 'Encoder'
  encoder: t.Type<Input, Output, unknown>
  metadata: MetadataByStatusCode
}

export type NoEncoder = { type: 'NoEncoder' }

export type Encoder<Input, Output> =
  | WithEncoder<Input, Output>
  | NoEncoder

export const noEncoder: Encoder<never, never> = {
  type: 'NoEncoder',
}

export const makeEncoder = <
  StatusCode extends number,
  Input,
  Output
>(
  statusCode: StatusCode,
  encoder: t.Type<Input, Output, unknown>,
  metadata: Metadata = {}
): WithEncoder<
  { code: StatusCode; data: Input },
  { code: StatusCode; data: Output }
> => ({
  type: 'Encoder',
  encoder: t.type({
    code: t.literal(statusCode),
    data: encoder,
  }),
  metadata: {
    [statusCode]: metadata,
  },
})

export const or = <InputA, OutputA, InputB, OutputB>(
  a: Encoder<InputA, OutputA>,
  b: Encoder<InputB, OutputB>
): Encoder<InputA | InputB, OutputA | OutputB> => {
  if (a.type !== 'Encoder' && b.type === 'Encoder') {
    return b as Encoder<InputA | InputB, OutputA | OutputB>
  }
  if (a.type === 'Encoder' && b.type !== 'Encoder') {
    return a as Encoder<InputA | InputB, OutputA | OutputB>
  }
  if (a.type === 'Encoder' && b.type === 'Encoder') {
    return {
      type: 'Encoder',
      encoder: t.union([a.encoder, b.encoder]),
      metadata: { ...a.metadata, ...b.metadata },
    }
  }
  return { type: 'NoEncoder' }
}
