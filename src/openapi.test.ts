import {
  createOpenAPISpec,
  responsesObject,
  pathItemForRoute,
} from './openapi'
import * as t from 'io-ts'
import { response, routeWithHandler } from './Handler'
import { getRoute, lit } from './routeCombinators'
import { pipe } from 'fp-ts/function'
import * as T from 'fp-ts/Task'

const healthDecoder = t.type({
  code: t.literal(200),
  data: t.literal('OK'),
})

const healthz = routeWithHandler(
  pipe(getRoute, lit('healthz')),
  healthDecoder,
  () => {
    return T.of(response(200, 'OK' as const))
  }
)

describe('createOpenAPISpec', () => {
  it('Kinda works', () => {
    const json = createOpenAPISpec(healthz)

    console.log(JSON.stringify(json))
    expect(json).not.toBeNull()
  })
  it('responsesObject', () => {
    const resp = responsesObject(healthDecoder)
    expect(Object.keys(resp)).toEqual(['200'])
  })
  it('pathItemForRoute', () => {
    const [name, _] = pathItemForRoute(
      healthz.route,
      healthz.responseDecoder
    )
    expect(name).toEqual('/healthz')
  })
})
