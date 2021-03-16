import {
  Route,
  routeLiteral,
  routeParam,
  matchRoute,
} from './index'
import * as E from 'fp-ts/Either'

const healthz: Route = [routeLiteral('healthz')]
const userName: Route = [
  routeLiteral('user'),
  routeLiteral('name'),
]
const userId: Route = [
  routeLiteral('user'),
  routeParam('id'),
]

describe('Route matching', () => {
  it('Healthz endpoint', () => {
    expect(matchRoute(healthz)('/healthz')).toEqual(
      E.right({})
    )
    expect(
      E.isRight(matchRoute(healthz)('/health'))
    ).toBeFalsy()
  })
  it('Username endpoint', () => {
    expect(matchRoute(userName)('/user/name')).toEqual(
      E.right({})
    )
    expect(
      E.isRight(matchRoute(userName)('/user/oh/name'))
    ).toBeFalsy()
  })

  it('userId endpoint', () => {
    expect(matchRoute(userId)('/user/name')).toEqual(
      E.right({ id: 'name' })
    )
    expect(matchRoute(userId)('/user/123')).toEqual(
      E.right({ id: '123' })
    )
    expect(
      E.isRight(matchRoute(userId)('/user/oh/name'))
    ).toBeFalsy()
  })
})
