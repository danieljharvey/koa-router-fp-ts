import { OpenAPIV3 } from 'openapi-types'
import * as t from 'io-ts'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as T from 'fp-ts/Task'

import {
  makeRoute,
  lit,
  get,
  data,
  post,
  response,
  taskHandler,
  taskEitherHandler,
  respond,
  description,
  summary,
  createRouter,
} from '../index'

import {
  withEncoder,
  createOpenAPISpec,
  getRouteResponses,
  getPathItemForRoute,
} from './openapi'
import {
  OpenAPIState,
  initialState,
  toEither,
  evaluate,
} from './types'

const healthzDecoder = t.literal('OK')

const healthzHandler = taskHandler(
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

const userGetHandler = taskHandler(
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

const userPostHandler = taskHandler(
  makeRoute(
    post,
    lit('user'),
    data(t.type({ id: t.number, name: t.string })),
    response(200, userSuccessDecoder),
    description('Saves a user to the database')
  ),
  ({ data: { id, name } }) =>
    T.of(
      respond(200, {
        message: 'OK',
        users: [
          { userId: id, firstName: 'Mr', surname: name },
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

const infoSuccessDecoder = t.union([t.string, t.number])

const infoFailureDecoder = t.intersection(
  [
    t.type({
      errorMsg: t.string,
    }),
    t.partial({ optionalStuff: t.string }),
  ],
  'InfoFailure'
)

const infoHandler = taskEitherHandler(
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
    description('Posted information'),
    summary('Information')
  ),
  ({ data: { name, age } }) =>
    age > 18
      ? TE.right(respond(200, `Great job, ${name}`))
      : TE.left(respond(500, { errorMsg: 'Oh no' }))
)

describe('koa-router-fp-ts', () => {
  describe('createOpenAPISpec', () => {
    describe('withEncoder', () => {
      it('withEncoder primitives', () => {
        expect(evaluate(withEncoder(t.string))).toEqual(
          E.right({ type: 'string' })
        )
        expect(evaluate(withEncoder(t.boolean))).toEqual(
          E.right({ type: 'boolean' })
        )
        expect(evaluate(withEncoder(t.number))).toEqual(
          E.right({ type: 'number' })
        )
        expect(evaluate(withEncoder(t.Int))).toEqual(
          E.right({ type: 'integer' })
        )
      })
      it('array', () => {
        expect(
          evaluate(withEncoder(t.array(t.string)))
        ).toEqual(
          E.right({
            type: 'array',
            items: { type: 'string' },
          })
        )
      })
      it('type', () => {
        expect(
          evaluate(
            withEncoder(
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
            required: ['one', 'two'],
          })
        )
      })

      it('keyOf', () => {
        expect(
          evaluate(
            withEncoder(
              t.keyof({ Horse: 0, Course: 0, Morse: 0 })
            )
          )
        ).toEqual(
          E.right({
            type: 'string',
            enum: ['Horse', 'Course', 'Morse'],
          })
        )
      })
      it('union of string literals creates enum', () => {
        expect(
          evaluate(
            withEncoder(
              t.union([
                t.literal('Horse'),
                t.literal('Course'),
                t.literal('Morse'),
              ])
            )
          )
        ).toEqual(
          E.right({
            type: 'string',
            enum: ['Horse', 'Course', 'Morse'],
          })
        )
      })
      it('union of number literals creates enum', () => {
        expect(
          evaluate(
            withEncoder(
              t.union([
                t.literal(1),
                t.literal(2),
                t.literal(3),
              ])
            )
          )
        ).toEqual(
          E.right({
            type: 'string',
            enum: ['1', '2', '3'],
          })
        )
      })
      it('union of boolean literals creates enum', () => {
        expect(
          evaluate(
            withEncoder(
              t.union([t.literal(true), t.literal(false)])
            )
          )
        ).toEqual(
          E.right({
            type: 'string',
            enum: ['true', 'false'],
          })
        )
      })

      describe('specific encoders work', () => {
        it('Null', () => {
          expect(evaluate(withEncoder(t.null))).toEqual(
            E.right({ type: 'object', nullable: true })
          )
        })
        it('Undefined', () => {
          expect(
            evaluate(withEncoder(t.undefined))
          ).toEqual(
            E.right({ type: 'object', nullable: true })
          )
        })
        it('Unknown', () => {
          expect(evaluate(withEncoder(t.unknown))).toEqual(
            E.right({ type: 'object' })
          )
        })

        it('Date', () => {
          expect(evaluate(withEncoder(t.date))).toEqual(
            E.right({ type: 'string', format: 'date' })
          )
        })
        it('String literal', () => {
          expect(
            evaluate(withEncoder(t.literal('OK')))
          ).toEqual(
            E.right({ type: 'string', example: 'OK' })
          )
        })
        it('Number literal', () => {
          expect(
            evaluate(withEncoder(t.literal(123)))
          ).toEqual(
            E.right({ type: 'number', example: '123' })
          )
        })
        it('Boolean literal', () => {
          expect(
            evaluate(withEncoder(t.literal(true)))
          ).toEqual(
            E.right({ type: 'boolean', example: 'true' })
          )
        })
        it(`BigIntFromString`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.BigIntFromString))
            )
          ).toEqual(true)
        })
        it(`BooleanFromNumber`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.BooleanFromNumber))
            )
          ).toEqual(true)
        })
        it(`BooleanFromString`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.BooleanFromString))
            )
          ).toEqual(true)
        })
        it.skip(`Either(string,number)`, () => {
          expect(
            E.isRight(
              evaluate(
                withEncoder(t.either(t.string, t.number))
              )
            )
          ).toEqual(true)
        })
        it(`DateFromISOString`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.DateFromISOString))
            )
          ).toEqual(true)
        })
        it(`DateFromNumber`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.DateFromNumber))
            )
          ).toEqual(true)
        })
        it(`DateFromUnixTime`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.DateFromUnixTime))
            )
          ).toEqual(true)
        })
        it(`IntFromString`, () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.IntFromString))
            )
          ).toEqual(true)
        })
        // need to fix third generic vars in t.Type around the lib to accept this one
        /*
    it(`JsonFromString`, () => {
      expect(
        E.isRight(evaluate(withEncoder(t.JsonFromString)))
      ).toEqual(true)
    })
    */
        it.skip(`NonEmptyArray(string)`, () => {
          expect(
            E.isRight(
              evaluate(
                withEncoder(t.nonEmptyArray(t.string))
              )
            )
          ).toEqual(true)
        })
        it('NonEmptyString', () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.NonEmptyString))
            )
          ).toEqual(true)
        })
        it('NumberFromString', () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.NumberFromString))
            )
          ).toEqual(true)
        })
        it.skip('Option(string)', () => {
          expect(
            E.isRight(
              evaluate(withEncoder(t.option(t.string)))
            )
          ).toEqual(true)
        })
        it.skip('ReadonlyNonEmptyArray(string)', () => {
          expect(
            E.isRight(
              evaluate(
                withEncoder(
                  t.readonlyNonEmptyArray(t.string)
                )
              )
            )
          ).toEqual(true)
        })
        it('RegExp', () => {
          expect(
            E.isRight(evaluate(withEncoder(t.regexp)))
          ).toEqual(true)
        })
        it('UUID', () => {
          expect(
            E.isRight(evaluate(withEncoder(t.UUID)))
          ).toEqual(true)
        })
      })
    })

    it('Kinda works', () => {
      const json = createOpenAPISpec(
        createRouter([healthzHandler])
      )

      expect(json).not.toEqual(null)
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
                schema: { type: 'string', example: 'OK' },
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
                required: [
                  'userId',
                  'firstName',
                  'surname',
                ],
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
                required: ['message', 'users'],
              },
            },
          ],
        },
      ]

      expect(resp).toEqual(E.right(expected))
    })
    describe('Complete spec', () => {
      it('Multiple routes', () => {
        const json = createOpenAPISpec(
          createRouter(
            [
              userGetHandler,
              userPostHandler,
              healthzHandler,
              infoHandler,
            ],
            {
              title: 'Test API',
              description: 'Really great API',
            }
          )
        )

        const expected: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            description: 'Really great API',
            version: '1.0.0',
          },
          paths: {
            '/healthz': {
              get: {
                description:
                  'Returns a 200 to indicate the service is running',
                summary: '/healthz',
                requestBody: undefined,
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
                summary: '/user',
                requestBody: undefined,
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
              post: {
                description: 'Saves a user to the database',
                summary: '/user',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['id', 'name'],
                        properties: {
                          id: { type: 'number' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
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
                summary: 'Information',
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        $ref:
                          '#/components/schemas/InfoPostData',
                      },
                    },
                  },
                },
                responses: {
                  '200': {
                    description:
                      'Info fetched successfully',
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
                example: 'OK',
              },
              InfoFailure: {
                type: 'object',
                properties: {
                  errorMsg: {
                    type: 'string',
                  },
                  optionalStuff: {
                    type: 'string',
                  },
                },
                required: ['errorMsg'],
              },
              InfoSuccess: {
                type: 'object',
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                ],
              },
              InfoPostData: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  age: { type: 'number' },
                },
                required: ['name', 'age'],
              },
              User: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  surname: { type: 'string' },
                  userId: { type: 'number' },
                },
                required: [
                  'userId',
                  'firstName',
                  'surname',
                ],
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
                required: ['message', 'users'],
              },
            },
          },
        }

        expect(json).toEqual(E.right(expected))
      })
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
})
