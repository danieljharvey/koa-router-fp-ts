import {
  Route,
  routeLiteral,
  routeParam,
  matchRoute,
  combineRoutes,
  getRoute,
  postRoute,
  literal,
  param,
  validateParams,
  validateQuery,
  validateData,
  validateHeaders,
} from './Route'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { numberDecoder, booleanDecoder } from './decoders'

const healthz = pipe(
  getRoute,
  combineRoutes(literal('healthz'))
)

const userName = pipe(
  getRoute,
  combineRoutes(literal('user')),
  combineRoutes(literal('name'))
)

const userId = pipe(
  getRoute,
  combineRoutes(literal('user')),
  combineRoutes(param('id')),
  combineRoutes(
    validateParams(t.type({ id: numberDecoder }))
  )
)

const userWithQuery = pipe(
  getRoute,
  combineRoutes(literal('users')),
  combineRoutes(
    validateQuery(
      t.type({ id: numberDecoder, flag: booleanDecoder })
    )
  )
)

const userWithHeaders = pipe(
  getRoute,
  combineRoutes(literal('users')),
  combineRoutes(
    validateHeaders(t.type({ sessionId: numberDecoder }))
  )
)

const userWithData = pipe(
  postRoute,
  combineRoutes(literal('users')),
  combineRoutes(
    validateData(t.type({ dog: booleanDecoder }))
  )
)

describe('Route matching', () => {
  it('Healthz endpoint', () => {
    expect(
      matchRoute(healthz)('/healthz', 'get', {}, {})
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
        matchRoute(healthz)('/health', 'get', {}, {})
      )
    ).toBeFalsy()
    expect(
      E.isRight(
        matchRoute(healthz)('/healthz', 'post', {}, {})
      )
    ).toBeFalsy()
  })
  it('Username endpoint', () => {
    expect(
      matchRoute(userName)('/user/name', 'get', {}, {})
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
        matchRoute(userName)('/user/oh/name', 'get', {}, {})
      )
    ).toBeFalsy()
  })

  it('userId endpoint', () => {
    expect(
      matchRoute(userId)('/user/123', 'get', {}, {})
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
        matchRoute(userId)('/user/name', 'get', {}, {})
      )
    ).toBeFalsy()

    expect(
      E.isRight(
        matchRoute(userId)('/user/oh/name', 'get', {}, {})
      )
    ).toBeFalsy()
  })

  it('userWithHeaders endpoint', () => {
    expect(
      matchRoute(userWithHeaders)(
        '/users',
        'get',
        {},
        { sessionId: '123' }
      )
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
        matchRoute(userWithHeaders)(
          '/users',
          'get',
          {},
          { sessionId: 'sdfsdf' }
        )
      )
    ).toBeFalsy()

    expect(
      E.isRight(
        matchRoute(userWithHeaders)(
          '/users/',
          'get',
          {},
          {}
        )
      )
    ).toBeFalsy()
  })

  it('userWithData endpoint', () => {
    expect(
      matchRoute(userWithData)(
        '/users',
        'post',
        { dog: 'true' },
        {}
      )
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
        matchRoute(userWithData)(
          '/users',
          'post',
          { sessionId: 'sdfsdf' },
          {}
        )
      )
    ).toBeFalsy()

    expect(
      E.isRight(
        matchRoute(userWithData)(
          '/users/',
          'post',
          { dog: 1 },
          {}
        )
      )
    ).toBeFalsy()
  })
})
