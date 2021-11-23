import * as E from 'fp-ts/Either'
import * as t from 'io-ts'
import * as tt from 'io-ts-types'
import {
  get,
  post,
  lit,
  param,
  data,
  header,
} from '../index'
import { matchRoute } from '../matchRoute'
import { makeRoute } from '../makeRoute'

const healthz = makeRoute(get, lit('healthz'))

const userName = makeRoute(get, lit('user'), lit('name'))

const userId = makeRoute(
  get,
  lit('user'),
  param('id', tt.NumberFromString)
)

const userWithHeaders = makeRoute(
  get,
  lit('users'),
  header('sessionId', tt.NumberFromString)
)

const userWithData = makeRoute(
  post,
  lit('users'),
  data(t.type({ dog: tt.BooleanFromString }))
)

describe('route matching', () => {
  it('get after Post works is Get', () => {
    const healthzGet = makeRoute(post, get, lit('healthz'))
    expect(
      E.isRight(
        matchRoute(healthzGet)({
          url: '/healthz',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(true)
  })

  it('healthz endpoint', () => {
    expect(
      matchRoute(healthz)({
        url: '/healthz',
        method: 'get',
        rawData: {},
        rawHeaders: {},
      })
    ).toEqual(
      E.right({
        params: {},
        query: {},
        data: {},
        headers: {},
      })
    )
    expect(
      E.isRight(
        matchRoute(healthz)({
          url: '/health',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(false)
    expect(
      E.isRight(
        matchRoute(healthz)({
          url: '/healthz',
          method: 'post',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(false)
  })
  it('username endpoint', () => {
    expect(
      matchRoute(userName)({
        url: '/user/name',
        method: 'get',
        rawData: {},
        rawHeaders: {},
      })
    ).toEqual(
      E.right({
        params: {},
        query: {},
        data: {},
        headers: {},
      })
    )
    expect(
      E.isRight(
        matchRoute(userName)({
          url: '/user/oh/name',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(false)
  })

  it('userId endpoint', () => {
    expect(
      matchRoute(userId)({
        url: '/user/123',
        method: 'get',
        rawData: {},
        rawHeaders: {},
      })
    ).toEqual(
      E.right({
        params: { id: 123 },
        query: {},
        data: {},
        headers: {},
      })
    )
    expect(
      E.isRight(
        matchRoute(userId)({
          url: '/user/name',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(false)

    expect(
      E.isRight(
        matchRoute(userId)({
          url: '/user/oh/name',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(false)
  })

  it('userWithHeaders endpoint', () => {
    expect(
      matchRoute(userWithHeaders)({
        url: '/users',
        method: 'get',
        rawData: {},
        rawHeaders: { sessionid: '123' },
      })
    ).toEqual(
      E.right({
        params: {},
        query: {},
        data: {},
        headers: { sessionid: 123 },
      })
    )
    expect(
      E.isRight(
        matchRoute(userWithHeaders)({
          url: '/users',
          method: 'get',
          rawData: {},
          rawHeaders: { sessionid: 'sdfsdf' },
        })
      )
    ).toEqual(false)

    expect(
      E.isRight(
        matchRoute(userWithHeaders)({
          url: '/users/',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toEqual(false)
  })

  it('userWithData endpoint', () => {
    expect(
      matchRoute(userWithData)({
        url: '/users',
        method: 'post',
        rawData: { dog: 'true' },
        rawHeaders: {},
      })
    ).toEqual(
      E.right({
        params: {},
        query: {},
        data: { dog: true },
        headers: {},
      })
    )
    expect(
      E.isRight(
        matchRoute(userWithData)({
          url: '/users',
          method: 'post',
          rawData: { sessionId: 'sdfsdf' },
          rawHeaders: {},
        })
      )
    ).toEqual(false)

    expect(
      E.isRight(
        matchRoute(userWithData)({
          url: '/users/',
          method: 'post',
          rawData: { dog: 1 },
          rawHeaders: {},
        })
      )
    ).toEqual(false)
  })
})
