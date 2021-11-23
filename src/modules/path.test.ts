import * as t from 'io-ts'

import { lit, param } from './routeCombinators'
import { path } from './path'
import { emptyRoute } from '../types/Route'
import {
  routeLiteral,
  routeParam,
} from '../types/RouteItem'
import { makeRoute } from './makeRoute'

// this function won't type check if Typescript doesn't think the two args
// are the same
const areTypeEqual = <A>(_a: A, _b: A) => true

describe('path', () => {
  it('has no interpolated', () => {
    expect(path``).toEqual({
      ...emptyRoute,
      parts: [],
    })
    expect(path`/`).toEqual({
      ...emptyRoute,
      parts: [],
    })
    expect(path`dog`).toEqual({
      ...emptyRoute,
      parts: [routeLiteral('dog')],
    })
    expect(path`dog/log`).toEqual({
      ...emptyRoute,
      parts: [routeLiteral('dog'), routeLiteral('log')],
    })
  })
  describe('has only interpolated items', () => {
    const idParam = param('id', t.string)
    const nameParam = param('name', t.string)

    it('one item', () => {
      const result1 = path`${idParam}`
      expect(result1.parts).toHaveLength(1)
      expect(result1.parts).toEqual(idParam.parts)
      expect(result1.paramDecoder).toEqual(
        idParam.paramDecoder
      )
      expect(areTypeEqual(result1, idParam)).toEqual(true)
    })

    it('two items', () => {
      const result2 = path`${idParam}/${nameParam}`
      const expected = makeRoute(idParam, nameParam)

      expect(result2.parts).toHaveLength(2)
      expect(result2.parts).toEqual(expected.parts)
      expect(JSON.stringify(result2.paramDecoder)).toEqual(
        JSON.stringify(expected.paramDecoder)
      )
      expect(areTypeEqual(result2, expected)).toEqual(true)
    })

    it('two items, no slash', () => {
      const result3 = path`${idParam}${nameParam}`
      const expected = makeRoute(idParam, nameParam)

      expect(result3.parts).toHaveLength(2)
      expect(result3.parts).toEqual(expected.parts)
      expect(JSON.stringify(result3.paramDecoder)).toEqual(
        JSON.stringify(expected.paramDecoder)
      )
      expect(areTypeEqual(result3, expected)).toEqual(true)
    })
  })

  it('interleaves literals and params correctly', () => {
    const equivalentRoute = makeRoute(
      lit('home'),
      lit('users'),
      param('userId', t.string),
      lit('thanks')
    )

    const expected = [
      routeLiteral('home'),
      routeLiteral('users'),
      routeParam('userId'),
      routeLiteral('thanks'),
    ]

    const userId = param('userId', t.string)
    const result = path`home/users/${userId}/thanks`

    expect(areTypeEqual(result, equivalentRoute)).toEqual(
      true
    )
    expect(result.parts).toEqual(expected)
  })
})
