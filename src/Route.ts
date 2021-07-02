import { RouteItem } from './RouteItem'
import { Method, combineMethod } from './Method'
import * as D from './Decoder'
type GenericRec = Record<string, unknown>
import * as O from 'fp-ts/Option'

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

export type CombineRoute<
  ResponseTypeB,
  ParamB extends GenericRec = {},
  QueryB extends GenericRec = {},
  DataB extends GenericRec = {},
  HeadersB extends GenericRec = {}
> = <
  ResponseTypeA,
  ParamA extends GenericRec = {},
  QueryA extends GenericRec = {},
  DataA extends GenericRec = {},
  HeadersA extends GenericRec = {}
>(
  route: Route<
    ResponseTypeA,
    ParamA,
    QueryA,
    DataA,
    HeadersA
  >
) => Route<
  ResponseTypeA | ResponseTypeB,
  ParamA & ParamB,
  QueryA & QueryB,
  DataA & DataB,
  HeadersA & HeadersB
>

export const combineRoutes = <
  ResponseTypeB,
  ParamB extends GenericRec,
  QueryB extends GenericRec,
  DataB extends GenericRec,
  HeadersB extends GenericRec
>(
  b: Route<ResponseTypeB, ParamB, QueryB, DataB, HeadersB>
): CombineRoute<
  ResponseTypeB,
  ParamB,
  QueryB,
  DataB,
  HeadersB
> => a => ({
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
