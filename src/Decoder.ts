import * as t from 'io-ts'

export type Decoder<A> =
  | {
      type: 'Decoder'
      decoder: t.Type<A, unknown, unknown>
    }
  | { type: 'NoDecoder' }

type GenericRec = Record<string, unknown>

export const and = <
  ParamA extends GenericRec,
  ParamB extends GenericRec
>(
  a: Decoder<ParamA>,
  b: Decoder<ParamB>
): Decoder<ParamA & ParamB> => {
  if (a.type !== 'Decoder' && b.type === 'Decoder') {
    return b as Decoder<ParamA & ParamB>
  }
  if (a.type === 'Decoder' && b.type !== 'Decoder') {
    return a as Decoder<ParamA & ParamB>
  }
  if (a.type === 'Decoder' && b.type === 'Decoder') {
    return {
      type: 'Decoder',
      decoder: t.intersection([a.decoder, b.decoder]),
    }
  }
  return { type: 'NoDecoder' }
}

export const or = <ParamA, ParamB>(
  a: Decoder<ParamA>,
  b: Decoder<ParamB>
): Decoder<ParamA | ParamB> => {
  if (a.type !== 'Decoder' && b.type === 'Decoder') {
    return b as Decoder<ParamA | ParamB>
  }
  if (a.type === 'Decoder' && b.type !== 'Decoder') {
    return a as Decoder<ParamA | ParamB>
  }
  if (a.type === 'Decoder' && b.type === 'Decoder') {
    return {
      type: 'Decoder',
      decoder: t.union([a.decoder, b.decoder]),
    }
  }
  return { type: 'NoDecoder' }
}
