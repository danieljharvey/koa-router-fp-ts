import * as t from 'io-ts'
import * as T from 'fp-ts/Task'
import * as E from 'fp-ts/Either'

import { runRouteWithHandler, respond } from './runRoute'
import { routeWithTaskHandler } from './Handler'
import {
  response,
  get,
  lit,
  param,
} from './routeCombinators'
import { numberDecoder } from './decoders'
import { makeRoute } from './makeRoute'

describe('test the handlers', () => {
  it('uses the healthz handler successfully', async () => {
    const responseD = t.type({
      code: t.literal(200),
      data: t.literal('OK'),
    })

    const healthz = routeWithTaskHandler(
      makeRoute(get, lit('healthz'), response(responseD)),

      () => {
        return T.of(respond(200, 'OK' as const))
      }
    )

    const result = await runRouteWithHandler(healthz)({
      url: '/healthz',
      method: 'get',
      rawData: {},
      rawHeaders: {},
    })()

    expect(result).toEqual(
      E.right(E.right({ code: 200, data: 'OK' }))
    )
  })

  it('uses a doggy handler', async () => {
    const dogAges = {
      frank: 100,
      stuart: 10,
      horse: 23,
    }

    const dogResponse = t.union([
      t.type({
        code: t.literal(200),
        data: t.array(t.string),
      }),
      t.type({ code: t.literal(400), data: t.string }),
    ])

    const dogAgesHandler = routeWithTaskHandler(
      makeRoute(
        get,
        lit('dogs'),
        param('age', numberDecoder),
        response(dogResponse)
      ),
      ({ params: { age } }) => {
        const matchingDogs = Object.entries(dogAges).filter(
          ([_, dogAge]) => dogAge === age
        )
        return matchingDogs.length > 0
          ? T.of(
              respond(
                200,
                matchingDogs.map(([name]) => name)
              )
            )
          : T.of(respond(400, 'No dogs found'))
      }
    )

    const result = await runRouteWithHandler(
      dogAgesHandler
    )({
      url: '/dogs/100',
      method: 'get',
      rawData: {},
      rawHeaders: {},
    })()
    expect(result).toEqual(
      E.right(E.right({ code: 200, data: ['frank'] }))
    )
  })
})
