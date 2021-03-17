import {
  Route,
  routeLiteral,
  routeParam,
  matchRoute,
  combineRoutes,
  getRoute,
  literal,
  param,
  validateParams,
  validateQuery,
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

describe('Route matching', () => {
  it('Healthz endpoint', () => {
    expect(matchRoute(healthz)('/healthz', 'get')).toEqual(
      E.right({ params: {}, query: {} })
    )
    expect(
      E.isRight(matchRoute(healthz)('/health', 'get'))
    ).toBeFalsy()
    expect(
      E.isRight(matchRoute(healthz)('/healthz', 'post'))
    ).toBeFalsy()
  })
  it('Username endpoint', () => {
    expect(
      matchRoute(userName)('/user/name', 'get')
    ).toEqual(E.right({ params: {}, query: {} }))
    expect(
      E.isRight(
        matchRoute(userName)('/user/oh/name', 'get')
      )
    ).toBeFalsy()
  })

  it('userId endpoint', () => {
    expect(matchRoute(userId)('/user/123', 'get')).toEqual(
      E.right({ params: { id: 123 }, query: {} })
    )
    expect(
      E.isRight(matchRoute(userId)('/user/name', 'get'))
    ).toBeFalsy()

    expect(
      E.isRight(matchRoute(userId)('/user/oh/name', 'get'))
    ).toBeFalsy()
  })

  it('userWithQuery endpoint', () => {
    expect(
      matchRoute(userWithQuery)(
        '/users?id=123&flag=true',
        'get'
      )
    ).toEqual(
      E.right({
        params: {},
        query: { id: 123, flag: true },
      })
    )
    expect(
      E.isRight(
        matchRoute(userWithQuery)(
          '/users?id=dog&flag=tue',
          'get'
        )
      )
    ).toBeFalsy()

    expect(
      E.isRight(matchRoute(userWithQuery)('/users/', 'get'))
    ).toBeFalsy()
  })
})
