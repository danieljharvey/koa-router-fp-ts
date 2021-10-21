import * as O from 'fp-ts/Option'

import { RouteItem } from './RouteItem'
import { Method, combineMethod } from './Method'
import * as D from './Decoder'
import * as E from './Encoder'

export type GenericRec = Record<string, unknown>

export type EmptyRec = Record<never, never>

// Route is the basic type under everything.
// It is designed Monoidally so a Route is made by combining multiple Routes
// together
export type Route<
  ResponseInput = never,
  ResponseOutput = never,
  Param = EmptyRec,
  Query = EmptyRec,
  Data = EmptyRec,
  Headers = EmptyRec
> = {
  method: O.Option<Method>
  parts: RouteItem[]
  responseEncoder: E.Encoder<ResponseInput, ResponseOutput>
  paramDecoder: D.Decoder<Param>
  queryDecoder: D.Decoder<Query>
  dataDecoder: D.Decoder<Data>
  headersDecoder: D.Decoder<Headers>
  description: string[]
}

// useful for `A extends AnyRoute`
export type AnyRoute =
  | Route<any, any, any, any, any, any>
  | Route<never, never, any, any, any, any>

// get type of combining two Routes
export type CombinedRoute<A, B> = B extends Route<
  infer ResponseInputB,
  infer ResponseOutputB,
  infer ParamB,
  infer QueryB,
  infer DataB,
  infer HeadersB
>
  ? A extends Route<
      infer ResponseInputA,
      infer ResponseOutputA,
      infer ParamA,
      infer QueryA,
      infer DataA,
      infer HeadersA
    >
    ? Route<
        ResponseInputA | ResponseInputB,
        ResponseOutputA | ResponseOutputB,
        ParamA & ParamB,
        QueryA & QueryB,
        DataA & DataB,
        HeadersA & HeadersB
      >
    : never
  : never

// value-level combination of routes
export const combine = <
  ResponseInputA,
  ResponseOutputA,
  ParamA extends GenericRec,
  QueryA extends GenericRec,
  DataA extends GenericRec,
  HeadersA extends GenericRec,
  ResponseInputB,
  ResponseOutputB,
  ParamB extends GenericRec,
  QueryB extends GenericRec,
  DataB extends GenericRec,
  HeadersB extends GenericRec
>(
  a: Route<
    ResponseInputA,
    ResponseOutputA,
    ParamA,
    QueryA,
    DataA,
    HeadersA
  >,
  b: Route<
    ResponseInputB,
    ResponseOutputB,
    ParamB,
    QueryB,
    DataB,
    HeadersB
  >
): CombinedRoute<
  Route<
    ResponseInputA,
    ResponseOutputA,
    ParamA,
    QueryA,
    DataA,
    HeadersA
  >,
  Route<
    ResponseInputB,
    ResponseOutputB,
    ParamB,
    QueryB,
    DataB,
    HeadersB
  >
> => ({
  method: combineMethod(a.method, b.method),
  parts: [...a.parts, ...b.parts],
  paramDecoder: D.and(a.paramDecoder, b.paramDecoder),
  queryDecoder: D.and(a.queryDecoder, b.queryDecoder),
  dataDecoder: D.and(a.dataDecoder, b.dataDecoder),
  headersDecoder: D.and(a.headersDecoder, b.headersDecoder),
  responseEncoder: E.or(
    a.responseEncoder,
    b.responseEncoder
  ),
  description: a.description.concat(...b.description),
})

export const emptyRoute: Route = {
  method: O.none,
  parts: [],
  responseEncoder: { type: 'NoEncoder' },
  paramDecoder: { type: 'NoDecoder' },
  queryDecoder: { type: 'NoDecoder' },
  dataDecoder: { type: 'NoDecoder' },
  headersDecoder: { type: 'NoDecoder' },
  description: [],
}
