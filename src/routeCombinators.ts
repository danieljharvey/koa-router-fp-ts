import * as t from 'io-ts'
import { routeLiteral, routeParam } from './RouteItem'
import { Route, emptyRoute } from './Route'
import * as O from 'fp-ts/Option'

export const getRoute: Route = {
  ...emptyRoute,
  method: O.some('GET'),
}

export const postRoute: Route = {
  ...emptyRoute,
  method: O.some('POST'),
}

export const withLiteral = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

export const withResponse = <ResponseType>(
  decoder: t.Type<ResponseType>
): Route<ResponseType> => ({
  ...emptyRoute,
  responseDecoder: { type: 'Decoder', decoder },
})

export const withParam = <ParamName extends string, Param>(
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

export const validateParams = <Param>(
  paramDecoder: t.Type<Param, unknown, unknown>
): Route<never, Param> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
})

export const validateQuery = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>
): Route<never, {}, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
})

export const validateData = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>
): Route<never, {}, {}, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
})

export const validateHeaders = <Headers>(
  headersDecoder: t.Type<Headers, unknown, unknown>
): Route<never, {}, {}, {}, Headers> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: headersDecoder,
  },
})
