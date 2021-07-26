import * as Koa from 'koa'
import { Server } from 'http'
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
import request from 'supertest'
import * as t from 'io-ts'
import * as T from 'fp-ts/Task'
import bodyParser from 'koa-bodyparser'

export const withServer = async (
  router: Koa.Middleware,
  fn: (server: Server) => Promise<unknown>
) => {
  const app = new Koa.default()

  app.use(bodyParser())
  app.use(router)

  // rando port between 3000 and 8000
  const PORT = Math.floor(Math.random() * 3000) + 5000

  const server = app.listen(PORT)

  try {
    await fn(server)
  } catch (e) {
    //console.error(e)
    throw e
  } finally {
    server.close()
  }
}

const healthzDecoder = t.type({
  code: t.literal(200),
  data: t.literal('OK'),
})

const healthz = routeWithTaskHandler(
  makeRoute(get, lit('healthz'), response(healthzDecoder)),

  () => T.of(respond(200, 'OK' as const))
)

describe('Testing with koa', () => {
  it('Returns a 404 when no routes are found', async () => {
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

  it('Returns a 404 when method does not match for healthz route', async () => {
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

  it('Returns a 200 when healthz route is found', async () => {
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

  const readyzDecoder = t.type({
    code: t.literal(201),
    data: t.literal('OK'),
  })

  const readyz = routeWithTaskHandler(
    makeRoute(get, lit('readyz'), response(readyzDecoder)),

    () => T.of(respond(201, 'OK' as const))
  )

  it("Returns a 200 when the healthz route is found but it's the second in the list of routes", async () => {
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

  it('Returns a 201 when the readyz route is found', async () => {
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
      response(
        t.type({ code: t.literal(200), data: t.number })
      ),
      response(
        t.type({ code: t.literal(400), data: t.string })
      )
    ),

    ({ params: { id } }) => T.of(respond(200, id))
  )

  it("Returns a 400 when the route matches but the params don't validate", async () => {
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

  it('Returns a 200 when the route and params match', async () => {
    await withServer(
      serveRoutes(userId),
      async (server) => {
        await request(server).get('/user/123').expect(200)
      }
    )
  })

  const userQuery = routeWithTaskHandler(
    makeRoute(
      get,
      lit('user'),
      response(
        t.type({ code: t.literal(200), data: t.number })
      ),
      query(t.type({ id: numberDecoder }))
    ),

    ({ query: { id } }) => T.of(respond(200, id))
  )

  it('Returns a 200 when the route and query params match', async () => {
    await withServer(
      serveRoutes(userQuery),
      async (server) => {
        await request(server)
          .get('/user?id=123')
          .expect(200)
      }
    )
  })

  const userHeader = routeWithTaskHandler(
    makeRoute(
      get,
      lit('user'),
      response(
        t.type({ code: t.literal(200), data: t.number })
      ),
      headers(t.type({ session: numberDecoder }))
    ),

    ({ headers: { session } }) =>
      T.of(respond(200, session))
  )

  it('Returns a 200 when the route and headers match', async () => {
    await withServer(
      serveRoutes(userHeader),
      async (server) => {
        await request(server)
          .get('/user')
          .set({ session: '123' })
          .expect(200)
      }
    )
  })

  const userPost = routeWithTaskHandler(
    makeRoute(
      post,
      lit('user'),
      response(
        t.type({ code: t.literal(200), data: t.number })
      ),
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

  it('Returns a 200 when the route and data matches', async () => {
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
