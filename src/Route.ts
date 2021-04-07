import { RouteItem } from './RouteItem'
import { Method, combineMethod } from './Method'
import { Decoder, combineParamDecoder } from './Decoder'
type GenericRec = Record<string, unknown>
import * as O from 'fp-ts/Option'

export type Route<
  Param = {},
  Query = {},
  Data = {},
  Headers = {}
> = {
  method: O.Option<Method>
  parts: RouteItem[]
  paramDecoder: Decoder<Param>
  queryDecoder: Decoder<Query>
  dataDecoder: Decoder<Data>
  headersDecoder: Decoder<Headers>
}

export type CombineRoute<
  ParamB extends GenericRec = {},
  QueryB extends GenericRec = {},
  DataB extends GenericRec = {},
  HeadersB extends GenericRec = {}
> = <
  ParamA extends GenericRec = {},
  QueryA extends GenericRec = {},
  DataA extends GenericRec = {},
  HeadersA extends GenericRec = {}
>(
  route: Route<ParamA, QueryA, DataA, HeadersA>
) => Route<
  ParamA & ParamB,
  QueryA & QueryB,
  DataA & DataB,
  HeadersA & HeadersB
>

export const combineRoutes = <
  ParamB extends GenericRec,
  QueryB extends GenericRec,
  DataB extends GenericRec,
  HeadersB extends GenericRec
>(
  b: Route<ParamB, QueryB, DataB, HeadersB>
): CombineRoute<ParamB, QueryB, DataB, HeadersB> => (
  a
) => ({
  method: combineMethod(a.method, b.method),
  parts: [...a.parts, ...b.parts],
  paramDecoder: combineParamDecoder(
    a.paramDecoder,
    b.paramDecoder
  ),
  queryDecoder: combineParamDecoder(
    a.queryDecoder,
    b.queryDecoder
  ),
  dataDecoder: combineParamDecoder(
    a.dataDecoder,
    b.dataDecoder
  ),
  headersDecoder: combineParamDecoder(
    a.headersDecoder,
    b.headersDecoder
  ),
})

export const emptyRoute: Route<{}, {}, {}, {}> = {
  method: O.none,
  parts: [],
  paramDecoder: { type: 'NoDecoder' },
  queryDecoder: { type: 'NoDecoder' },
  dataDecoder: { type: 'NoDecoder' },
  headersDecoder: { type: 'NoDecoder' },
}
