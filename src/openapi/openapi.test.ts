import { OpenAPIV3 } from 'openapi-types'

import {
  withDecoder,
  createOpenAPISpec,
  getRouteResponses,
  getPathItemForRoute,
} from './openapi'
import * as t from 'io-ts'
import {
  makeRoute,
  lit,
  get,
  data,
  post,
  response,
  routeWithTaskHandler,
  routeWithTaskEitherHandler,
  respond,
  description,
} from '../index'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'
import {
  OpenAPIState,
  initialState,
  toEither,
  evaluate,
} from './types'

const healthzDecoder = t.string

const healthzHandler = routeWithTaskHandler(
  makeRoute(
    get,
    lit('healthz'),
    response(200, healthzDecoder, {
      description: 'Success',
      schemaName: 'HealthzResponse',
    }),
    description(
      'Returns a 200 to indicate the service is running'
    )
  ),
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
    message: t.string,
    users: t.array(user),
  },
  'UserSuccess'
)

const userHandler = routeWithTaskHandler(
  makeRoute(
    get,
    lit('user'),
    response(200, userSuccessDecoder),
    description('Returns a single user from the database')
  ),
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

const infoPostData = t.type(
  {
    name: t.string,
    age: t.number,
  },
  'InfoPostData'
)

const infoSuccessDecoder = t.string

const infoFailureDecoder = t.type(
  {
    errorMsg: t.string,
  },
  'InfoFailure'
)

const infoHandler = routeWithTaskEitherHandler(
  makeRoute(
    post,
    data(infoPostData),
    lit('info'),
    response(500, infoFailureDecoder, {
      description: 'Failed to fetch info',
    }),
    response(200, infoSuccessDecoder, {
      schemaName: 'InfoSuccess',
      description: 'Info fetched successfully',
    }),
    description('Posted information')
  ),
  ({ data: { name, age } }) =>
    age > 18
      ? TE.right({
          code: 200 as const,
          data: `Great job, ${name}`,
        })
      : TE.left({
          code: 500 as const,
          data: { errorMsg: 'Oh no' },
        })
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
    const json = createOpenAPISpec([healthzHandler])

    expect(json).not.toBeNull()
  })

  it('getRouteResponses', () => {
    const resp = toEither(
      getRouteResponses(
        t.type({
          code: t.literal(200),
          data: healthzDecoder,
        }),
        {
          200: {
            description: 'Successful OK great',
            schemaName: 'Healthz',
          },
        }
      ),
      initialState
    )
    expect(resp).toEqual(
      E.right([
        {
          '200': {
            description: 'Successful OK great',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Healthz',
                },
              },
            },
          },
        },
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

  it('getRouteResponses with named decoders', () => {
    const resp = toEither(
      getRouteResponses(
        t.type({
          code: t.literal(200),
          data: userSuccessDecoder,
        }),
        {
          200: { description: 'Success fetching user' },
        }
      ),
      initialState
    )

    const json = createOpenAPISpec([userHandler])

    const expected: [
      OpenAPIV3.ResponsesObject,
      OpenAPIState
    ] = [
      {
        '200': {
          description: 'Success fetching user',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserSuccess',
              },
            },
          },
        },
      },
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

  it('Multiple routes', () => {
    const json = createOpenAPISpec([
      userHandler,
      healthzHandler,
      infoHandler,
    ])

    const expected: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'My API', version: '1.0.0' },
      paths: {
        '/healthz': {
          get: {
            description:
              'Returns a 200 to indicate the service is running',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref:
                        '#/components/schemas/HealthzResponse',
                    },
                  },
                },
              },
            },
          },
        },
        '/user': {
          get: {
            description:
              'Returns a single user from the database',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref:
                        '#/components/schemas/UserSuccess',
                    },
                  },
                },
              },
            },
          },
        },
        '/info': {
          post: {
            description: 'Posted information',
            responses: {
              '200': {
                description: 'Info fetched successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref:
                        '#/components/schemas/InfoSuccess',
                    },
                  },
                },
              },
              '500': {
                description: 'Failed to fetch info',
                content: {
                  'application/json': {
                    schema: {
                      $ref:
                        '#/components/schemas/InfoFailure',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          HealthzResponse: {
            type: 'string',
          },
          InfoFailure: {
            type: 'object',
            properties: {
              errorMsg: {
                type: 'string',
              },
            },
          },
          InfoSuccess: {
            type: 'string',
          },
          User: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              surname: { type: 'string' },
              userId: { type: 'number' },
            },
          },

          UserSuccess: {
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
      },
    }

    expect(json).toEqual(E.right(expected))
  })

  it('getPathItemForRoute', () => {
    const result = evaluate(
      getPathItemForRoute(
        healthzHandler.route,
        healthzHandler.route.responseEncoder
      )
    )
    expect((result as any).right.url).toEqual('/healthz')
  })
})
