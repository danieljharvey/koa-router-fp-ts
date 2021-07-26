import { getUser, getUsers } from './simple'
import { withServer } from '../../index.test'
import { serveRoutes } from '../../index'
import request from 'supertest'

const app = serveRoutes(getUser, getUsers)

describe('getUser', () => {
  it('Cannot find user', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/user/123/')

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual('User not found')
    })
  })

  it('Found user', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/user/100/')

      expect(reply.status).toEqual(200)
      expect(reply.body).toEqual({
        name: 'dog',
        age: 100,
      })
    })
  })
})

describe('getUsers', () => {
  it('Found users', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/users/')

      expect(reply.status).toEqual(200)
      expect(reply.body).toEqual([
        {
          name: 'dog',
          age: 100,
        },
        { name: 'cat', age: 3 },
      ])
    })
  })
})
