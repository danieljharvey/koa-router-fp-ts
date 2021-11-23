import * as request from 'supertest'
import * as t from 'io-ts'
import * as T from 'fp-ts/Task'
import * as tt from 'io-ts-types'

import { withServer } from './helpers/withServer'
import {
  serve,
  createRouter,
  makeRoute,
  lit,
  get,
  path,
  post,
  param,
  query,
  header,
  data,
  response,
  taskHandler,
  pureHandler,
  respond,
} from './index'

const healthzDecoder = t.literal('OK')

const healthz = taskHandler(
  makeRoute(
    get,
    lit('healthz'),
    response(200, healthzDecoder)
  ),

  () => T.of(respond(200, 'OK' as const))
)

describe('testing with koa', () => {
  describe('method matching', () => {
    it('returns a 404 when no routes are found', async () => {
      await withServer(
        serve(createRouter([healthz])),
        async (server) => {
          const reply = await request(server)
            .get('/')
            .expect(404)

          expect(reply.text).toEqual('Not Found')
        }
      )
    })

    it('returns a 404 when method does not match for healthz route', async () => {
      await withServer(
        serve(createRouter([healthz])),
        async (server) => {
          const reply = await request(server)
            .post('/healthz')
            .expect(404)

          expect(reply.text).toEqual('Not Found')
        }
      )
    })

    it('returns a 200 when healthz route is found', async () => {
      await withServer(
        serve(createRouter([healthz])),
        async (server) => {
          const reply = await request(server)
            .get('/healthz')
            .expect(200)

          expect(reply.status).toEqual(200)
          expect(reply.text).toEqual('OK')
        }
      )
    })
  })

  const readyzDecoder = t.literal('OK')

  const readyz = taskHandler(
    makeRoute(
      get,
      lit('readyz'),
      response(201, readyzDecoder)
    ),

    () => T.of(respond(201, 'OK' as const))
  )

  describe('path matching', () => {
    it("returns a 200 when the healthz route is found but it's the second in the list of routes", async () => {
      await withServer(
        serve(createRouter([readyz, healthz])),
        async (server) => {
          const reply = await request(server)
            .get('/healthz')
            .expect(200)

          expect(reply.status).toEqual(200)
          expect(reply.text).toEqual('OK')
        }
      )
    })

    it('returns a 201 when the readyz route is found', async () => {
      await withServer(
        serve(createRouter([readyz, healthz])),
        async (server) => {
          const reply = await request(server)
            .get('/readyz')
            .expect(201)

          expect(reply.headers['content-type']).toContain(
            'text/plain; charset=utf-8'
          )
          expect(reply.status).toEqual(201)
          expect(reply.text).toEqual('OK')
        }
      )
    })
  })

  const userIdParam = param('userId', tt.NumberFromString)

  const cleverHandler = taskHandler(
    makeRoute(
      get,
      path`/users/${userIdParam}/information`,
      response(200, t.number)
    ),
    ({ params: { userId } }) => {
      return T.of(respond(200, userId))
    }
  )

  describe('Multiple routes template string testing', () => {
    it('It works correctly', async () => {
      await withServer(
        serve(createRouter([cleverHandler])),
        async (server) => {
          const reply = await request(server)
            .get('/users/123/information')
            .expect(200)
          expect(reply.body).toEqual(123)
        }
      )
    })
    it('It fails correctly', async () => {
      await withServer(
        serve(createRouter([cleverHandler])),
        async (server) => {
          await request(server)
            .get('/users/nope/information')
            .expect(400)
        }
      )
    })
  })

  const userId = taskHandler(
    makeRoute(
      get,
      lit('user'),
      param('id', tt.NumberFromString),
      response(200, t.number),
      response(400, t.string)
    ),

    ({ params: { id } }) => T.of(respond(200, id))
  )

  const echoHandler = pureHandler(
    makeRoute(
      get,
      lit('echo'),
      param('item', t.string),
      response(200, t.string)
    ),
    ({ params: { item } }) => respond(200, item)
  )

  describe('param matching', () => {
    it("returns a 400 when the route matches but the params don't validate", async () => {
      await withServer(
        serve(createRouter([userId])),
        async (server) => {
          const reply = await request(server)
            .get('/user/dog')
            .expect(400)
          expect(reply.text).toContain(
            'params: Expecting NumberFromString at id but instead got: "dog"'
          )
        }
      )
    })

    it('returns a 200 when the route and params match', async () => {
      await withServer(
        serve(createRouter([userId])),
        async (server) => {
          const response = await request(server).get(
            '/user/123'
          )
          expect(response.status).toEqual(200)
        }
      )
    })

    it('Url decodes params', async () => {
      await withServer(
        serve(createRouter([echoHandler])),
        async (server) => {
          const response = await request(server).get(
            '/echo/horse%20time'
          )
          expect(response.status).toEqual(200)
          expect(response.text).toEqual('horse time')
        }
      )
    })
  })

  describe('query matching', () => {
    const userQuery = taskHandler(
      makeRoute(
        get,
        lit('user'),
        response(200, t.array(t.number)),
        query('id', tt.NumberFromString)
      ),

      ({ query: { id } }) => T.of(respond(200, id))
    )

    const echoQuery = pureHandler(
      makeRoute(
        get,
        lit('echo'),
        query('item', t.string),
        response(200, t.string)
      ),
      ({ query: { item } }) => respond(200, item.join(''))
    )

    it('returns a 200 when the route matches', async () => {
      await withServer(
        serve(createRouter([userQuery])),
        async (server) => {
          const response = await request(server).get(
            '/user'
          )
          expect(response.status).toEqual(200)
        }
      )
    })

    it('returns a 200 when the route and query params match', async () => {
      await withServer(
        serve(createRouter([userQuery])),
        async (server) => {
          const response = await request(server).get(
            '/user?id=123'
          )
          expect(response.status).toEqual(200)
        }
      )
    })

    it('returns a 200 when multiple query params match', async () => {
      await withServer(
        serve(createRouter([userQuery])),
        async (server) => {
          const response = await request(server).get(
            '/user?id=123&id=456'
          )
          expect(response.status).toEqual(200)
        }
      )
    })

    it('returns a 400 when there is a query passed but it cannot be decoded', async () => {
      await withServer(
        serve(createRouter([userQuery])),
        async (server) => {
          const response = await request(server).get(
            '/user?id=horse'
          )
          expect(response.status).toEqual(400)
        }
      )
    })

    it('URI decodes the query strings', async () => {
      await withServer(
        serve(createRouter([echoQuery])),
        async (server) => {
          const response = await request(server).get(
            '/echo?item=horse%20time'
          )
          expect(response.status).toEqual(200)
          expect(response.text).toEqual('horse time')
        }
      )
    })
  })

  const userHeader = taskHandler(
    makeRoute(
      get,
      lit('user'),
      response(200, t.number),
      header('session', tt.NumberFromString)
    ),

    ({ headers: { session } }) =>
      T.of(respond(200, session))
  )

  describe('header matching', () => {
    it('returns a 200 when the route and headers match', async () => {
      await withServer(
        serve(createRouter([userHeader])),
        async (server) => {
          const response = await request(server)
            .get('/user')
            .set({ session: '123' })
          expect(response.status).toEqual(200)
          expect(
            response.headers['content-type']
          ).toContain('application/json; charset=utf-8')
        }
      )
    })
  })

  const cacheControlHeader = taskHandler(
    makeRoute(
      get,
      lit('blah'),
      response(200, t.string),
      response(201, t.string),
      header(
        'Cache-Control',
        t.union([t.string, t.undefined])
      )
    ),

    ({ headers: { 'cache-control': cacheControl } }) =>
      cacheControl === 'max-age=0, must-revalidate'
        ? T.of(respond(200, 'cached'))
        : T.of(respond(201, 'not cached'))
  )

  describe('header matching', () => {
    it('returns a 200 when the Cache-Control header matches', async () => {
      await withServer(
        serve(createRouter([cacheControlHeader])),
        async (server) => {
          const response = await request(server)
            .get('/blah')
            .set({
              'Cache-Control': 'max-age=0, must-revalidate',
            })
          expect(response.status).toEqual(200)
        }
      )
    })
    it('returns a 201 when there is no matching Cache-Control header', async () => {
      await withServer(
        serve(createRouter([cacheControlHeader])),
        async (server) => {
          const response = await request(server).get(
            '/blah'
          )
          expect(response.status).toEqual(201)
        }
      )
    })
  })

  const userPost = taskHandler(
    makeRoute(
      post,
      lit('user'),
      response(200, t.number),
      data(
        t.type({
          sessionId: t.number,
          dog: t.boolean,
        })
      )
    ),
    ({ data: { sessionId } }) =>
      T.of(respond(200, sessionId))
  )
  describe('data matching', () => {
    it('returns a 200 when the route and data matches', async () => {
      await withServer(
        serve(createRouter([userPost])),
        async (server) => {
          const response = await request(server)
            .post('/user')
            .send({ sessionId: 123, dog: true })
            .expect(200)

          expect(response.body).toEqual(123)
        }
      )
    })
  })

  const headerz = taskHandler(
    makeRoute(get, lit('headerz'), response(200, t.string)),

    () =>
      T.of(
        respond(200, 'OK' as const, {
          username: 'dog',
          other: 'yes',
        })
      )
  )

  describe('returning header', () => {
    it('returns headers passed to respond', async () => {
      await withServer(
        serve(createRouter([headerz])),
        async (server) => {
          const reply = await request(server)
            .get('/headerz')
            .expect(200)

          expect(reply.headers.username).toEqual('dog')
          expect(reply.headers.other).toEqual('yes')
        }
      )
    })
  })

  const router = createRouter(
    [headerz],
    { title: 'Test API', description: 'Nice' },
    'swagger2.json'
  )

  describe('Outputs openapi spec', () => {
    it('returns json including Router metadata', async () => {
      await withServer(serve(router), async (server) => {
        const reply = await request(server)
          .get('/swagger2.json')
          .expect(200)
        expect(reply.body.info.description).toEqual('Nice')
      })
    })
  })
})
