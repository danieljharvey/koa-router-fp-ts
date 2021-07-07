import * as t from 'io-ts'
import { routeLiteral, routeParam } from './RouteItem'
import { Route, emptyRoute } from './Route'
import * as O from 'fp-ts/Option'

export const get: Route = {
  ...emptyRoute,
  method: O.some('GET'),
}

export const post: Route = {
  ...emptyRoute,
  method: O.some('POST'),
}

export const lit = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

export const response = <ResponseType>(
  decoder: t.Type<ResponseType>
): Route<ResponseType> => ({
  ...emptyRoute,
  responseDecoder: { type: 'Decoder', decoder },
})

export const param = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>
): Route<never, Record<ParamName, Param>> => ({
  ...emptyRoute,
  parts: [routeParam(param)],
  paramDecoder: {
    type: 'Decoder',
    decoder: t.type({
      [param]: decoder,
    } as Record<ParamName, t.Type<Param, unknown, unknown>>),
  },
})

export const params = <Param>(
  paramDecoder: t.Type<Param, unknown, unknown>
): Route<never, Param> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
})

export const query = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>
): Route<never, {}, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
})

export const data = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>
): Route<never, {}, {}, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
})

export const headers = <Headers>(
  headersDecoder: t.Type<Headers, unknown, unknown>
): Route<never, {}, {}, {}, Headers> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: headersDecoder,
  },
})
