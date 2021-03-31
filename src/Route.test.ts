import {
  combineRoutes,
} from './Route'
import { getRoute,postRoute,lit,param,validateQuery,validateData,validateHeaders} from './routeCombinators'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { numberDecoder, booleanDecoder } from './decoders'
import { matchRoute } from './matchRoute'

const healthz = pipe(getRoute, lit('healthz'))

const userName = pipe(getRoute, lit('user'), lit('name'))

const userId = pipe(
  getRoute,
  lit('user'),
  param('id', numberDecoder)
)

const userWithQuery = pipe(
  getRoute,
  lit('users'),
  combineRoutes(
    validateQuery(
      t.type({ id: numberDecoder, flag: booleanDecoder })
    )
  )
)

const userWithHeaders = pipe(
  getRoute,
  lit('users'),
  combineRoutes(
    validateHeaders(t.type({ sessionId: numberDecoder }))
  )
)

const userWithData = pipe(
  postRoute,
  lit('users'),
  combineRoutes(
    validateData(t.type({ dog: booleanDecoder }))
  )
)

describe('Route matching', () => {
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
