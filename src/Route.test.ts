import {
  getRoute,
  postRoute,
  withLiteral,
  withParam,
  validateData,
  validateHeaders,
} from './routeCombinators'
import * as E from 'fp-ts/Either'
import * as t from 'io-ts'
import { numberDecoder, booleanDecoder } from './decoders'
import { matchRoute } from './matchRoute'
import { makeRoute } from './makeRoute'

const healthz = makeRoute(getRoute, withLiteral('healthz'))

const userName = makeRoute(
  getRoute,
  withLiteral('user'),
  withLiteral('name')
)

const userId = makeRoute(
  getRoute,
  withLiteral('user'),
  withParam('id', numberDecoder)
)

const userWithHeaders = makeRoute(
  getRoute,
  withLiteral('users'),
  validateHeaders(t.type({ sessionId: numberDecoder }))
)

const userWithData = makeRoute(
  postRoute,
  withLiteral('users'),
  validateData(t.type({ dog: booleanDecoder }))
)

describe('Route matching', () => {
  it('Get after Post works is Get', () => {
    const healthzGet = makeRoute(
      postRoute,
      getRoute,
      withLiteral('healthz')
    )
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
