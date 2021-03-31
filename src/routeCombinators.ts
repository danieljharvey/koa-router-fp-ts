import { flow } from 'fp-ts/function'
import * as t from 'io-ts'
import { routeLiteral,routeParam} from './RouteItem'
import { Route,CombineRoute,emptyRoute,combineRoutes} from './Route'

export const getRoute = emptyRoute

export const postRoute: Route = {
  ...emptyRoute,
  method: 'POST',
}

const literal = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
})

export const lit = (lit: string) =>
  flow(combineRoutes(literal(lit)))

export const param = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>
): CombineRoute<Record<ParamName, Param>> =>
  flow(combineRoutes(parameter(param, decoder)))

const parameter = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>
): Route<Record<ParamName, Param>> => ({
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
): Route<Param> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
})

export const validateQuery = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>
): Route<{}, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
})

export const validateData = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>
): Route<{}, {}, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
})

export const validateHeaders = <Headers>(
  headersDecoder: t.Type<Headers, unknown, unknown>
): Route<{}, {}, {}, Headers> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: headersDecoder,
  },
})



