import * as t from 'io-ts'

export type Decoder<Input> =
  | {
      type: 'Decoder'
      decoder: t.Type<Input, unknown, unknown> // replace any with correct return type
    }
  | { type: 'NoDecoder' }

type GenericRec = Record<string, unknown>

export const and = <
  InputA extends GenericRec,
  InputB extends GenericRec
>(
  a: Decoder<InputA>,
  b: Decoder<InputB>
): Decoder<InputA & InputB> => {
  if (a.type !== 'Decoder' && b.type === 'Decoder') {
    return b as Decoder<InputA & InputB>
  }
  if (a.type === 'Decoder' && b.type !== 'Decoder') {
    return a as Decoder<InputA & InputB>
  }
  if (a.type === 'Decoder' && b.type === 'Decoder') {
    return {
      type: 'Decoder',
      decoder: t.intersection([a.decoder, b.decoder]),
    }
  }
  return { type: 'NoDecoder' }
}

export const or = <InputA, InputB>(
  a: Decoder<InputA>,
  b: Decoder<InputB>
): Decoder<InputA | InputB> => {
  if (a.type !== 'Decoder' && b.type === 'Decoder') {
    return b as Decoder<InputA | InputB>
  }
  if (a.type === 'Decoder' && b.type !== 'Decoder') {
    return a as Decoder<InputA | InputB>
  }
  if (a.type === 'Decoder' && b.type === 'Decoder') {
    return {
      type: 'Decoder',
      decoder: t.union([a.decoder, b.decoder]),
    }
  }
  return { type: 'NoDecoder' }
}
