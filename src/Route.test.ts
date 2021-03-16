import {
  Route,
  routeLiteral,
  routeParam,
  matchRoute,
  combineRoutes,
  getRoute,
  literal,
  param,
} from './Route'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

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
  combineRoutes(param('id'))
)
console.log(userId)

describe('Route matching', () => {
  it('Healthz endpoint', () => {
    expect(matchRoute(healthz)('/healthz', 'get')).toEqual(
      E.right({})
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
    ).toEqual(E.right({}))
    expect(
      E.isRight(
        matchRoute(userName)('/user/oh/name', 'get')
      )
    ).toBeFalsy()
  })

  it('userId endpoint', () => {
    expect(matchRoute(userId)('/user/name', 'get')).toEqual(
      E.right({ id: 'name' })
    )
    expect(matchRoute(userId)('/user/123', 'get')).toEqual(
      E.right({ id: '123' })
    )
    expect(
      E.isRight(matchRoute(userId)('/user/oh/name', 'get'))
    ).toBeFalsy()
  })
})
