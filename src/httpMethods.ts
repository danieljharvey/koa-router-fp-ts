import * as O from 'fp-ts/Option'

import { Route, emptyRoute } from './types/Route'

/**
 * Makes a route into a GET route.
 * The GET method requests a representation of the specified resource. Requests using GET should only retrieve data.
 *
 * @example
 * makeRoute(
 *   get,
 *   lit('healthz'),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const get: Route = {
  ...emptyRoute,
  method: O.some('GET'),
}

/**
 * Makes a route into a POST route.
 * The POST method submits an entity to the specified resource, often causing a change in state or side effects on the server.
 *
 * @example
 * makeRoute(
 *   post,
 *   lit('users'),
 *   data(t.type({name:t.string, id: t.number})),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const post: Route = {
  ...emptyRoute,
  method: O.some('POST'),
}

/**
 * Makes a route into a HEAD route.
 * The HEAD method asks for a response identical to a GET request, but without the response body.
 *
 * @example
 * makeRoute(
 *   head,
 *   lit('users'),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const head: Route = {
  ...emptyRoute,
  method: O.some('HEAD'),
}

/**
 * Makes a route into a PUT route.
 * The PUT method replaces all current representations of the target resource with the request payload.
 *
 * @example
 * makeRoute(
 *   put,
 *   lit('users'),
 *   data(t.type({name:t.string, id: t.number})),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const put: Route = {
  ...emptyRoute,
  method: O.some('PUT'),
}

/**
 * Makes a route into a DELETE route.
 * The DELETE method deletes the specified resource.
 *
 * @example
 * makeRoute(
 *   delete,
 *   lit('users'),
 *   param('id', numberDecoder),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const del: Route = {
  ...emptyRoute,
  method: O.some('DELETE'),
}

/**
 * Makes a route into a PATCH route.
 * The PATCH method applies partial modifications to a resource.
 *
 * @example
 * makeRoute(
 *   patch,
 *   lit('users'),
 *   data(t.type({name:t.string, id: t.number})),
 *   response(200, t.literal('ok'))
 * )
 *
 */
export const patch: Route = {
  ...emptyRoute,
  method: O.some('PATCH'),
}
