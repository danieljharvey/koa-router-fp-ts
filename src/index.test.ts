import * as Koa from 'koa'
import { Server } from 'http'
import { router } from './index'
import {
  literal,
  combineRoutes,
  getRoute,
  param,
  validateParams,
} from './Route'
import request from 'supertest'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { numberDecoder } from './decoders'

const withServer = async (
  router: Koa.Middleware,
  fn: (server: Server) => Promise<unknown>
) => {
  const app = new Koa.default()

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

describe('Testing with koa', () => {
  it('Returns a 404 when no routes are found', async () => {
    const healthz = router(
      pipe(getRoute, combineRoutes(literal('healthz')))
    )

    await withServer(healthz, async server => {
      const reply = await request(server)
        .get('/')
        .expect(404)

      expect(reply.text).toEqual('Not Found')
    })
  })

  it('Returns a 404 when method does not match for healthz route', async () => {
    const healthz = router(
      pipe(getRoute, combineRoutes(literal('healthz')))
    )

    await withServer(healthz, async server => {
      const reply = await request(server)
        .post('/healthz')
        .expect(404)

      expect(reply.text).toEqual('Not Found')
    })
  })

  it('Returns a 200 when healthz route is found', async () => {
    const healthz = router(
      pipe(getRoute, combineRoutes(literal('healthz')))
    )

    await withServer(healthz, async server => {
      const reply = await request(server)
        .get('/healthz')
        .expect(200)

      expect(reply.status).toEqual(200)
      expect(reply.text).toEqual('Found')
    })
  })

  it("Returns a 400 when the route matches but the params don't validate", async () => {
    const userId = router(
      pipe(
        getRoute,
        combineRoutes(literal('user')),
        combineRoutes(param('id')),
        combineRoutes(
          validateParams(t.type({ id: numberDecoder }))
        )
      )
    )

    await withServer(userId, async server => {
      const reply = await request(server)
        .get('/user/dog')
        .expect(400)
      expect(reply.text).toContain(
        'Expecting NumberFromString'
      )
    })
  })

  it('Returns a 200 when the route and params match', async () => {
    const userId = router(
      pipe(
        getRoute,
        combineRoutes(literal('user')),
        combineRoutes(param('id')),
        combineRoutes(
          validateParams(t.type({ id: numberDecoder }))
        )
      )
    )

    await withServer(userId, async server => {
      await request(server).get('/user/123').expect(200)
    })
  })
})
