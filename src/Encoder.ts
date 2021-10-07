import * as t from 'io-ts'

type Metadata = {
  example?: unknown
  description?: string
}

type MetadataByResponse = Record<number, Metadata>

export type Encoder<Input, Output> =
  | {
      type: 'Encoder'
      encoder: t.Type<Input, Output, unknown>
      metadata: MetadataByResponse
    }
  | { type: 'NoEncoder' }

type GenericRec = Record<string, unknown>

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
