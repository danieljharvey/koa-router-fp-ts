import { RouteItem } from './RouteItem'
import { Method, combineMethod } from './Method'
import * as D from './Decoder'
type GenericRec = Record<string, unknown>
import * as O from 'fp-ts/Option'

// Route is the basic type under everything.
// It is designed Monoidally so a Route is made by combining multiple Routes
// together
export type Route<
  ResponseType = never,
  Param = {},
  Query = {},
  Data = {},
  Headers = {}
> = {
  method: O.Option<Method>
  parts: RouteItem[]
  responseDecoder: D.Decoder<ResponseType>
  paramDecoder: D.Decoder<Param>
  queryDecoder: D.Decoder<Query>
  dataDecoder: D.Decoder<Data>
  headersDecoder: D.Decoder<Headers>
}

// useful for `A extends AnyRoute`
export type AnyRoute =
  | Route<any, any, any, any, any>
  | Route<never, any, any, any, any>

// get type of combining two Routes
export type CombinedRoute<A, B> = B extends Route<
  infer ResponseTypeB,
  infer ParamB,
  infer QueryB,
  infer DataB,
  infer HeadersB
>
  ? A extends Route<
      infer ResponseTypeA,
      infer ParamA,
      infer QueryA,
      infer DataA,
      infer HeadersA
    >
    ? Route<
        ResponseTypeA | ResponseTypeB,
        ParamA & ParamB,
        QueryA & QueryB,
        DataA & DataB,
        HeadersA & HeadersB
      >
    : never
  : never

// value-level combination of routes
export const combine = <
  ResponseTypeA,
  ParamA extends GenericRec,
  QueryA extends GenericRec,
  DataA extends GenericRec,
  HeadersA extends GenericRec,
  ResponseTypeB,
  ParamB extends GenericRec,
  QueryB extends GenericRec,
  DataB extends GenericRec,
  HeadersB extends GenericRec
>(
  a: Route<ResponseTypeA, ParamA, QueryA, DataA, HeadersA>,
  b: Route<ResponseTypeB, ParamB, QueryB, DataB, HeadersB>
): CombinedRoute<
  Route<ResponseTypeA, ParamA, QueryA, DataA, HeadersA>,
  Route<ResponseTypeB, ParamB, QueryB, DataB, HeadersB>
> => ({
  method: combineMethod(a.method, b.method),
  parts: [...a.parts, ...b.parts],
  paramDecoder: D.and(a.paramDecoder, b.paramDecoder),
  queryDecoder: D.and(a.queryDecoder, b.queryDecoder),
  dataDecoder: D.and(a.dataDecoder, b.dataDecoder),
  headersDecoder: D.and(a.headersDecoder, b.headersDecoder),
  responseDecoder: D.or(
    a.responseDecoder,
    b.responseDecoder
  ),
})

export const emptyRoute: Route<never, {}, {}, {}, {}> = {
  method: O.none,
  parts: [],
  responseDecoder: { type: 'NoDecoder' },
  paramDecoder: { type: 'NoDecoder' },
  queryDecoder: { type: 'NoDecoder' },
  dataDecoder: { type: 'NoDecoder' },
  headersDecoder: { type: 'NoDecoder' },
}
