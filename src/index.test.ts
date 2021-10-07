import request from 'supertest'
import * as t from 'io-ts'
import * as T from 'fp-ts/Task'

import { withServer } from './helpers/withServer'
import {
  serveRoutes,
  makeRoute,
  numberDecoder,
  lit,
  get,
  post,
  param,
  query,
  headers,
  data,
  response,
  routeWithTaskHandler,
  respond,
} from './index'

const healthzDecoder = t.literal('OK')

const healthz = routeWithTaskHandler(
  makeRoute(
    get,
    lit('healthz'),
    response(200, healthzDecoder)
  ),

  () => T.of(respond(200, 'OK' as const))
)

describe('testing with koa', () => {
  it('returns a 404 when no routes are found', async () => {
    await withServer(
      serveRoutes(healthz),
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
      serveRoutes(healthz),
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
      serveRoutes(healthz),
      async (server) => {
        const reply = await request(server)
          .get('/healthz')
          .expect(200)

        expect(reply.status).toEqual(200)
        expect(reply.text).toEqual('OK')
      }
    )
  })

  const readyzDecoder = t.literal('OK')

  const readyz = routeWithTaskHandler(
    makeRoute(
      get,
      lit('readyz'),
      response(201, readyzDecoder)
    ),

    () => T.of(respond(201, 'OK' as const))
  )

  it("returns a 200 when the healthz route is found but it's the second in the list of routes", async () => {
    await withServer(
      serveRoutes(readyz, healthz),
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
      serveRoutes(readyz, healthz),
      async (server) => {
        const reply = await request(server)
          .get('/readyz')
          .expect(201)

        expect(reply.status).toEqual(201)
        expect(reply.text).toEqual('OK')
      }
    )
  })

  const userId = routeWithTaskHandler(
    makeRoute(
      get,
      lit('user'),
      param('id', numberDecoder),
      response(200, t.number),
      response(400, t.string)
    ),

    ({ params: { id } }) => T.of(respond(200, id))
  )

  it("returns a 400 when the route matches but the params don't validate", async () => {
    await withServer(
      serveRoutes(userId),
      async (server) => {
        const reply = await request(server)
          .get('/user/dog')
          .expect(400)
        expect(reply.text).toContain(
          'Expecting NumberFromString'
        )
      }
    )
  })

  it('returns a 200 when the route and params match', async () => {
    await withServer(
      serveRoutes(userId),
      async (server) => {
        const response = await request(server).get(
          '/user/123'
        )
        expect(response.status).toEqual(200)
      }
    )
  })

  const userQuery = routeWithTaskHandler(
    makeRoute(
      get,
      lit('user'),
      response(200, t.number),
      query(t.type({ id: numberDecoder }))
    ),

    ({ query: { id } }) => T.of(respond(200, id))
  )

  it('returns a 200 when the route and query params match', async () => {
    await withServer(
      serveRoutes(userQuery),
      async (server) => {
        const response = await request(server).get(
          '/user?id=123'
        )
        expect(response.status).toEqual(200)
      }
    )
  })

  const userHeader = routeWithTaskHandler(
    makeRoute(
      get,
      lit('user'),
      response(200, t.number),
      headers(t.type({ session: numberDecoder }))
    ),

    ({ headers: { session } }) =>
      T.of(respond(200, session))
  )

  it('returns a 200 when the route and headers match', async () => {
    await withServer(
      serveRoutes(userHeader),
      async (server) => {
        const response = await request(server)
          .get('/user')
          .set({ session: '123' })
        expect(response.status).toEqual(200)
      }
    )
  })

  const userPost = routeWithTaskHandler(
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

  it('returns a 200 when the route and data matches', async () => {
    await withServer(
      serveRoutes(userPost),
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
