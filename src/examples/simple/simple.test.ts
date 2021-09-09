import request from 'supertest'

import { withServer } from '../../helpers/withServer'
import { serveRoutes } from '../../index'

import { getUser, getUsers } from './simple'

const app = serveRoutes(getUser, getUsers)

describe('getUser', () => {
  it('cannot find user', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/user/123/')

      expect(reply.status).toEqual(400)
      expect(reply.text).toEqual('User not found')
    })
  })

  it('found user', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/user/100/')

      expect(reply.status).toEqual(200)
      expect(reply.body).toEqual({
        name: 'dog',
        age: 100,
        birthday: '2020-02-01T01:01:01.000Z',
      })
    })
  })
})

describe('getUsers', () => {
  it('found users', async () => {
    await withServer(app, async (server) => {
      const reply = await request(server).get('/users/')

      expect(reply.status).toEqual(200)
      expect(reply.body).toEqual([
        {
          name: 'dog',
          age: 100,
          birthday: '2020-02-01T01:01:01.000Z',
        },
        {
          name: 'cat',
          age: 3,
          birthday: '2020-02-01T01:01:01.000Z',
        },
      ])
    })
  })
})
