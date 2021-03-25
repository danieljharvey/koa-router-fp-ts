import * as Koa from 'koa'
import { Server } from 'http'
import { router } from './index'
import {
  lit,
  combineRoutes,
  getRoute,
  postRoute,
  param,
  validateQuery,
  validateHeaders,
  validateData,
} from './Route'
import request from 'supertest'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { numberDecoder } from './decoders'
import * as T from 'fp-ts/Task'
import bodyParser from 'koa-bodyparser'
import { routeWithHandler } from './Handler'

const withServer = async (
  router: Koa.Middleware,
  fn: (server: Server) => Promise<unknown>
) => {
  const app = new Koa.default()

  app.use(bodyParser())
  app.use(router)

  const PORT = process.env.PORT || 3000

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

const healthz = routeWithHandler(
  pipe(getRoute, lit('healthz')),
  () => T.of({ code: 200, data: 'OK' })
)

describe('Testing with koa', () => {
  it('Returns a 404 when no routes are found', async () => {
    await withServer(router(healthz), async server => {
      const reply = await request(server)
        .get('/')
        .expect(404)

      expect(reply.text).toEqual('Not Found')
    })
  })

  it('Returns a 404 when method does not match for healthz route', async () => {
    await withServer(router(healthz), async server => {
      const reply = await request(server)
        .post('/healthz')
        .expect(404)

      expect(reply.text).toEqual('Not Found')
    })
  })

  it('Returns a 200 when healthz route is found', async () => {
    await withServer(router(healthz), async server => {
      const reply = await request(server)
        .get('/healthz')
        .expect(200)

      expect(reply.status).toEqual(200)
      expect(reply.text).toEqual('Found')
    })
  })

  const userId = routeWithHandler(
    pipe(getRoute, lit('user'), param('id', numberDecoder)),
    ({ params: { id } }) => T.of({ code: 200, data: id })
  )

  it("Returns a 400 when the route matches but the params don't validate", async () => {
    await withServer(router(userId), async server => {
      const reply = await request(server)
        .get('/user/dog')
        .expect(400)
      expect(reply.text).toContain(
        'Expecting NumberFromString'
      )
    })
  })

  it('Returns a 200 when the route and params match', async () => {
    await withServer(router(userId), async server => {
      await request(server).get('/user/123').expect(200)
    })
  })

  const userQuery = routeWithHandler(
    pipe(
      getRoute,
      lit('user'),
      combineRoutes(
        validateQuery(t.type({ id: numberDecoder }))
      )
    ),
    ({ query: { id } }) => T.of({ code: 200, data: id })
  )

  it('Returns a 200 when the route and query params match', async () => {
    await withServer(router(userQuery), async server => {
      await request(server).get('/user?id=123').expect(200)
    })
  })

  const userHeader = routeWithHandler(
    pipe(
      getRoute,
      lit('user'),
      combineRoutes(
        validateHeaders(t.type({ session: numberDecoder }))
      )
    ),
    ({ headers: { session } }) =>
      T.of({ code: 200, data: session })
  )

  it('Returns a 200 when the route and headers match', async () => {
    await withServer(router(userHeader), async server => {
      await request(server)
        .get('/user')
        .set({ session: '123' })
        .expect(200)
    })
  })

  const userPost = routeWithHandler(
    pipe(
      postRoute,
      lit('user'),
      combineRoutes(
        validateData(
          t.type({
            sessionId: t.number,
            dog: t.boolean,
          })
        )
      )
    ),
    ({ data: { sessionId } }) =>
      T.of({ code: 200, data: sessionId })
  )

  it('Returns a 200 when the route and data matches', async () => {
    await withServer(router(userPost), async server => {
      await request(server)
        .post('/user')
        .send({ sessionId: 123, dog: true })
        .expect(200)
    })
  })
})
