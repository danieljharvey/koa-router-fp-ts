import { getUser } from './example'
import { withServer } from './index.test'
import { router } from './index'
import request from 'supertest'

describe('getUser', () => {
  it('Fails when no auth headers sent', async () => {
    await withServer(router(getUser), async server => {
      const reply = await request(server).get('/user/123/')

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual(
        'headers: Expecting NumberFromString at session but instead got: undefined'
      )
    })
  })
  it('Fails when wrong format of auth headers sent', async () => {
    await withServer(router(getUser), async server => {
      const reply = await request(server)
        .get('/user/123/')
        .set({ session: 'wrong' })

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual(
        'headers: Expecting NumberFromString at session but instead got: "wrong"'
      )
    })
  })

  it('Fails when wrong auth headers sent', async () => {
    await withServer(router(getUser), async server => {
      const reply = await request(server)
        .get('/user/123/')
        .set({ session: 99999 })

      expect(reply.status).toEqual(403)
      expect(reply.text).toEqual('Not authorised')
    })
  })

  it('Correct auth but cannot find user', async () => {
    await withServer(router(getUser), async server => {
      const reply = await request(server)
        .get('/user/123/')
        .set({ session: 123 })

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual('User not found')
    })
  })

  it('Found user', async () => {
    await withServer(router(getUser), async server => {
      const reply = await request(server)
        .get('/user/100/')
        .set({ session: 123 })

      expect(reply.status).toEqual(200)
      expect(reply.body).toEqual({
        name: 'dog',
        age: 100,
        requestedBy: 'mrdog123',
      })
    })
  })
})
