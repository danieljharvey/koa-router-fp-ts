import { OpenAPIV3 } from 'openapi-types'

import {
  withDecoder,
  createOpenAPISpec,
  responsesObject,
  pathItemForRoute,
} from './openapi'
import * as t from 'io-ts'
import {
  makeRoute,
  lit,
  get,
  response,
  routeWithTaskHandler,
  respond,
} from '../index'
import * as E from 'fp-ts/Either'

import * as T from 'fp-ts/Task'
import {
  OpenAPIState,
  initialState,
  toEither,
  evaluate,
} from './types'

const healthzDecoder = t.type(
  {
    code: t.literal(200),
    data: t.string,
  },
  'Healthz'
)

const healthz = routeWithTaskHandler(
  makeRoute(get, lit('healthz'), response(healthzDecoder)),
  () => T.of(respond(200, 'OK' as const))
)

const user = t.type(
  {
    userId: t.number,
    firstName: t.string,
    surname: t.string,
  },
  'User'
)

const userSuccessDecoder = t.type(
  {
    code: t.literal(200),
    data: t.type({
      message: t.string,
      users: t.array(user),
    }),
  },
  'UserSuccess'
)

const userHandler = routeWithTaskHandler(
  makeRoute(get, lit('user'), response(userSuccessDecoder)),
  () =>
    T.of(
      respond(200, {
        message: 'OK',
        users: [
          { userId: 1, firstName: 'Mr', surname: 'Dog' },
        ],
      })
    )
)

describe('createOpenAPISpec', () => {
  it('withDecoder primitives', () => {
    expect(evaluate(withDecoder(t.string))).toEqual(
      E.right({ type: 'string' })
    )
    expect(evaluate(withDecoder(t.boolean))).toEqual(
      E.right({ type: 'boolean' })
    )
    expect(evaluate(withDecoder(t.number))).toEqual(
      E.right({ type: 'number' })
    )
    expect(evaluate(withDecoder(t.Int))).toEqual(
      E.right({ type: 'integer' })
    )
  })
  it('withDecoder combinators', () => {
    expect(
      evaluate(withDecoder(t.array(t.string)))
    ).toEqual(
      E.right({ type: 'array', items: { type: 'string' } })
    )
    expect(
      evaluate(
        withDecoder(
          t.type({ one: t.string, two: t.number })
        )
      )
    ).toEqual(
      E.right({
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
    const resp = toEither(
      responsesObject(healthzDecoder),
      initialState
    )
    expect(resp).toEqual(
      E.right([
        { '200': { description: 'Healthz' } },
        {
          schemas: [
            {
              name: 'Healthz',
              schema: { type: 'string' },
            },
          ],
        },
      ])
    )
  })

  it('responsesObject with named decoders', () => {
    const resp = toEither(
      responsesObject(userSuccessDecoder),
      initialState
    )

    const json = createOpenAPISpec(userHandler)

    console.log(JSON.stringify(json))

    const expected: [
      OpenAPIV3.ResponsesObject,
      OpenAPIState
    ] = [
      { '200': { description: 'UserSuccess' } },
      {
        schemas: [
          {
            name: 'User',
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                surname: { type: 'string' },
                userId: { type: 'number' },
              },
            },
          },

          {
            name: 'UserSuccess',
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                users: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
          },
        ],
      },
    ]

    expect(resp).toEqual(E.right(expected))
  })

  it('pathItemForRoute', () => {
    const result = evaluate(
      pathItemForRoute(
        healthz.route,
        healthz.route.responseDecoder
      )
    )
    expect((result as any).right.url).toEqual('/healthz')
  })
})
