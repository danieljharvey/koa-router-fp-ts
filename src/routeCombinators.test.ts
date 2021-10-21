import { routes, param } from './routeCombinators'
import { emptyRoute } from './Route'
import { routeLiteral, routeParam } from './RouteItem'
import * as t from 'io-ts'
import { makeRoute } from './makeRoute'

describe('routes', () => {
  it('has no interpolated', () => {
    expect(routes``).toEqual({
      ...emptyRoute,
      parts: [],
    })
    expect(routes`/`).toEqual({
      ...emptyRoute,
      parts: [],
    })
    expect(routes`dog`).toEqual({
      ...emptyRoute,
      parts: [routeLiteral('dog')],
    })
    expect(routes`dog/log`).toEqual({
      ...emptyRoute,
      parts: [routeLiteral('dog'), routeLiteral('log')],
    })
  })
  describe('has only interpolated items', () => {
    const idParam = param('id', t.string)
    const nameParam = param('name', t.string)

    it('one item', () => {
      const result1 = routes`${idParam}`
      expect(result1.parts).toHaveLength(1)
      expect(result1.parts).toEqual(idParam.parts)
      expect(result1.paramDecoder).toEqual(
        idParam.paramDecoder
      )
    })

    it('two items', () => {
      const result2 = routes`${idParam}/${nameParam}`
      const expected = makeRoute(idParam, nameParam)

      expect(result2.parts).toHaveLength(2)
      expect(result2.parts).toEqual(expected.parts)
      expect(JSON.stringify(result2.paramDecoder)).toEqual(
        JSON.stringify(expected.paramDecoder)
      )
    })
    it('two items, no slash', () => {
      const result3 = routes`${idParam}${nameParam}`
      const expected = makeRoute(idParam, nameParam)

      expect(result3.parts).toHaveLength(2)
      expect(result3.parts).toEqual(expected.parts)
      expect(JSON.stringify(result3.paramDecoder)).toEqual(
        JSON.stringify(expected.paramDecoder)
      )
    })
  })

  it('interleaves literals and params correctly', () => {
    const expected = [
      routeLiteral('home'),
      routeLiteral('users'),
      routeParam('userId'),
      routeLiteral('thanks'),
    ]

    const userId = param('userId', t.string)
    const result = routes`home/users/${userId}/thanks`

    expect(result.parts).toEqual(expected)
  })
})
