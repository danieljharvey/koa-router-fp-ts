import * as O from 'fp-ts/Option'
import {
  withDecoder,
  createOpenAPISpec,
  responsesObject,
  pathItemForRoute,
} from './openapi'
import * as t from 'io-ts'
import { response, routeWithHandler } from '../Handler'
import { getRoute, lit } from '../routeCombinators'
import { pipe } from 'fp-ts/function'
import * as T from 'fp-ts/Task'

const healthDecoder = t.type({
  code: t.literal(200),
  data: t.string,
})

const healthz = routeWithHandler(
  pipe(getRoute, lit('healthz')),
  healthDecoder,
  () => {
    return T.of(response(200, 'OK'))
  }
)

describe('createOpenAPISpec', () => {
  it('withDecoder primitives', () => {
    expect(withDecoder(t.string)).toEqual(
      O.some({ type: 'string' })
    )
    expect(withDecoder(t.boolean)).toEqual(
      O.some({ type: 'boolean' })
    )
    expect(withDecoder(t.number)).toEqual(
      O.some({ type: 'number' })
    )
    expect(withDecoder(t.Int)).toEqual(
      O.some({ type: 'integer' })
    )
  })
  it('withDecoder combinators', () => {
    expect(withDecoder(t.array(t.string))).toEqual(
      O.some({ type: 'array', items: { type: 'string' } })
    )
    expect(
      withDecoder(t.type({ one: t.string, two: t.number }))
    ).toEqual(
      O.some({
        type: 'object',
        properties: {
          one: { type: 'string' },
          two: { type: 'number' },
        },
      })
    )
  })

  it('Kinda works', () => {
    const json = createOpenAPISpec(healthz)

    console.log(JSON.stringify(json))
    expect(json).not.toBeNull()
  })
  it('responsesObject', () => {
    const resp = responsesObject(healthDecoder)
    console.log(JSON.stringify(resp))
    expect(resp).toEqual({
      responses: { '200': { description: 'Success' } },
      namedSchemas: [
        {
          name: 'Success',
          schema: { type: 'string' },
        },
      ],
    })
  })
  it('pathItemForRoute', () => {
    const { url } = pathItemForRoute(
      healthz.route,
      healthz.responseDecoder
    )
    expect(url).toEqual('/healthz')
  })
})
