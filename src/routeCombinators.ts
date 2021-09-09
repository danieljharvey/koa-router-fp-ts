import * as t from 'io-ts';
import * as O from 'fp-ts/Option';

import { routeLiteral, routeParam } from './RouteItem';
import { EmptyRec, Route, emptyRoute } from './Route';

export const get: Route = {
  ...emptyRoute,
  method: O.some('GET'),
};

export const post: Route = {
  ...emptyRoute,
  method: O.some('POST'),
};

export const lit = (literal: string): Route => ({
  ...emptyRoute,
  parts: [routeLiteral(literal)],
});

export const response = <ResponseInput, ResponseOutput>(
  encoder: t.Type<ResponseInput, ResponseOutput, unknown>,
): Route<ResponseInput, ResponseOutput> => ({
  ...emptyRoute,
  responseEncoder: { type: 'Encoder', encoder },
});

export const param = <ParamName extends string, Param>(
  param: ParamName,
  decoder: t.Type<Param, unknown, unknown>,
): Route<never, never, Record<ParamName, Param>> => ({
  ...emptyRoute,
  parts: [routeParam(param)],
  paramDecoder: {
    type: 'Decoder',
    decoder: t.type({
      [param]: decoder,
    } as Record<ParamName, t.Type<Param, unknown, unknown>>),
  },
});

export const params = <Param>(
  paramDecoder: t.Type<Param, unknown, unknown>,
): Route<never, never, Param> => ({
  ...emptyRoute,
  paramDecoder: { type: 'Decoder', decoder: paramDecoder },
});

export const query = <Query>(
  queryDecoder: t.Type<Query, unknown, unknown>,
): Route<never, never, EmptyRec, Query> => ({
  ...emptyRoute,
  queryDecoder: { type: 'Decoder', decoder: queryDecoder },
});

export const data = <Data>(
  dataDecoder: t.Type<Data, unknown, unknown>,
): Route<never, never, EmptyRec, EmptyRec, Data> => ({
  ...emptyRoute,
  dataDecoder: { type: 'Decoder', decoder: dataDecoder },
});

export const headers = <Headers>(
  headersDecoder: t.Type<Headers, unknown, unknown>,
): Route<never, never, EmptyRec, EmptyRec, EmptyRec, Headers> => ({
  ...emptyRoute,
  headersDecoder: {
    type: 'Decoder',
    decoder: headersDecoder,
  },
});
