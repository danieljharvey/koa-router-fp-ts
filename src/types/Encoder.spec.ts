import * as t from 'io-ts'

import * as E from './Encoder'

const one: E.WithEncoder<
  {
    code: 200
    data: { dog: string }
    headers: E.HeaderReturn
  },
  {
    code: 200
    data: { dog: string }
    headers: E.HeaderReturn
  }
> = E.makeEncoder(200, t.type({ dog: t.string }), {
  schemaName: '200Response',
})

const two: E.WithEncoder<
  {
    code: 201
    data: { cat: number }
    headers: E.HeaderReturn
  },
  {
    code: 201
    data: { cat: number }
    headers: E.HeaderReturn
  }
> = E.makeEncoder(201, t.type({ cat: t.number }), {
  schemaName: '201Response',
  description: 'Horses',
})

const three: E.WithEncoder<
  {
    code: 201
    data: { cat: number }
    headers: E.HeaderReturn
  },
  {
    code: 201
    data: { cat: number }
    headers: E.HeaderReturn
  }
> = E.makeEncoder(201, t.type({ cat: t.number }))

describe('koa-router-fp-ts', () => {
  describe('Encoder', () => {
    it('Combines metadata when combining routes', () => {
      const expected = {
        200: {
          schemaName: '200Response',
        },
        201: {
          schemaName: '201Response',
          description: 'Horses',
        },
      }
      const combined = E.or(one, two)
      expect(
        combined.type === 'Encoder' && combined.metadata
      ).toEqual(expected)
    })

    it('Combines metadata when combining routes where one metadata is empty', () => {
      const expected = {
        200: {
          schemaName: '200Response',
        },
        201: {},
      }
      const combined = E.or(one, three)
      expect(
        combined.type === 'Encoder' && combined.metadata
      ).toEqual(expected)
    })

    it('empty + one equals one', () => {
      const combined = E.or(one, E.noEncoder)
      expect(combined).toEqual(one)
    })
    it('one + empty  equals one', () => {
      const combined = E.or(E.noEncoder, one)
      expect(combined).toEqual(one)
    })
  })
})
