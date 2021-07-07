import {
  get,
  post,
  lit,
  param,
  data,
  headers,
} from './routeCombinators'
import * as E from 'fp-ts/Either'
import * as t from 'io-ts'
import { numberDecoder, booleanDecoder } from './decoders'
import { matchRoute } from './matchRoute'
import { makeRoute } from './makeRoute'

const healthz = makeRoute(get, lit('healthz'))

const userName = makeRoute(get, lit('user'), lit('name'))

const userId = makeRoute(
  get,
  lit('user'),
  param('id', numberDecoder)
)

const userWithHeaders = makeRoute(
  get,
  lit('users'),
  headers(t.type({ sessionId: numberDecoder }))
)

const userWithData = makeRoute(
  post,
  lit('users'),
  data(t.type({ dog: booleanDecoder }))
)

describe('Route matching', () => {
  it('Get after Post works is Get', () => {
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
    ).toBeTruthy()
  })

  it('Healthz endpoint', () => {
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
    ).toBeFalsy()
    expect(
      E.isRight(
        matchRoute(healthz)({
          url: '/healthz',
          method: 'post',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toBeFalsy()
  })
  it('Username endpoint', () => {
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
    ).toBeFalsy()
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
    ).toBeFalsy()

    expect(
      E.isRight(
        matchRoute(userId)({
          url: '/user/oh/name',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toBeFalsy()
  })

  it('userWithHeaders endpoint', () => {
    expect(
      matchRoute(userWithHeaders)({
        url: '/users',
        method: 'get',
        rawData: {},
        rawHeaders: { sessionId: '123' },
      })
    ).toEqual(
      E.right({
        params: {},
        query: {},
        data: {},
        headers: { sessionId: 123 },
      })
    )
    expect(
      E.isRight(
        matchRoute(userWithHeaders)({
          url: '/users',
          method: 'get',
          rawData: {},
          rawHeaders: { sessionId: 'sdfsdf' },
        })
      )
    ).toBeFalsy()

    expect(
      E.isRight(
        matchRoute(userWithHeaders)({
          url: '/users/',
          method: 'get',
          rawData: {},
          rawHeaders: {},
        })
      )
    ).toBeFalsy()
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
    ).toBeFalsy()

    expect(
      E.isRight(
        matchRoute(userWithData)({
          url: '/users/',
          method: 'post',
          rawData: { dog: 1 },
          rawHeaders: {},
        })
      )
    ).toBeFalsy()
  })
})
