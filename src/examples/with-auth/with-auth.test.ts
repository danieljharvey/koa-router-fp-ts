import * as request from 'supertest'

import { withServer } from '../../helpers/withServer'
import { serve, createRouter } from '../../index'

import { getUser, getUsers } from './with-auth'

const app = serve(createRouter([getUser, getUsers]))

describe('Examples - withAuth - getUser', () => {
  it('fails when no auth headers sent', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/user/123/')

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual(
        'headers: Expecting NumberFromString at session but instead got: undefined'
      )
    })
  })
  it('fails when wrong format of auth headers sent', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server)
        .get('/user/123/')
        .set({ session: 'wrong' })

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual(
        'headers: Expecting NumberFromString at session but instead got: "wrong"'
      )
    })
  })

  it('fails when wrong auth headers sent', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server)
        .get('/user/123/')
        .set({ session: 99999 })

      expect(reply.status).toEqual(403)
      expect(reply.text).toEqual('Not authorised')
    })
  })

  it('correct auth but cannot find user', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server)
        .get('/user/123/')
        .set({ session: 123 })

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual('User not found')
    })
  })

  it('found user', async () => {
    await withServer(app, async (server) => {
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

describe('Examples - withAuth - getUsers', () => {
  it('fails when no auth headers sent', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/users/')

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual(
        'headers: Expecting NumberFromString at 0.session but instead got: undefined'
      )
    })
  })
  it('fails when wrong format of auth headers sent', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server)
        .get('/users/')
        .set({ session: 'wrong' })

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual(
        'headers: Expecting NumberFromString at 0.session but instead got: "wrong"'
      )
    })
  })

  it('fails when wrong auth headers sent', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server)
        .get('/users/')
        .set({ session: 99999 })

      expect(reply.status).toEqual(403)
      expect(reply.text).toEqual('Not authorised')
    })
  })

  it('found users', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server)
        .get('/users/')
        .set({ session: 123 })

      expect(reply.status).toEqual(200)
      expect(reply.body).toEqual([
        {
          name: 'dog',
          age: 100,
          requestedBy: 'mrdog123',
        },
        { name: 'cat', age: 3, requestedBy: 'mrdog123' },
      ])
    })
  })
})
