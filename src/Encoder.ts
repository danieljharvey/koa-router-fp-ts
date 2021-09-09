import * as t from 'io-ts'

export type Encoder<Input, Output> =
  | {
      type: 'Encoder'
      encoder: t.Type<Input, Output, unknown>
    }
  | { type: 'NoEncoder' }

type GenericRec = Record<string, unknown>

export const and = <
  InputA extends GenericRec,
  OutputA extends GenericRec,
  InputB extends GenericRec,
  OutputB extends GenericRec
>(
  a: Encoder<InputA, OutputB>,
  b: Encoder<InputB, OutputB>
): Encoder<InputA & InputB, OutputA & OutputB> => {
  if (a.type !== 'Encoder' && b.type === 'Encoder') {
    return b as Encoder<InputA & InputB, OutputA & OutputB>
  }
  if (a.type === 'Encoder' && b.type !== 'Encoder') {
    return a as Encoder<InputA & InputB, OutputA & OutputB>
  }
  if (a.type === 'Encoder' && b.type === 'Encoder') {
    return {
      type: 'Encoder',
      encoder: t.intersection([a.encoder, b.encoder]),
    } as Encoder<InputA & InputB, OutputA & OutputB>
  }
  return { type: 'NoEncoder' }
}

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
    }
  }
  return { type: 'NoEncoder' }
}
