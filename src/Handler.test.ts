import {
  runRouteWithHandler,
  routeWithHandler,
  response,
} from './Handler'
import * as t from 'io-ts'
import * as T from 'fp-ts/Task'
import * as E from 'fp-ts/Either'
import { getRoute, lit, param } from './routeCombinators'
import { pipe } from 'fp-ts/lib/function'
import { numberDecoder } from './decoders'

describe('Test the goddamn handlers', () => {
  it('Uses the healthz handler successfully', async () => {
    const responseD = t.type({
      code: t.literal(200),
      data: t.literal('OK'),
    })

    const healthz = routeWithHandler(
      pipe(getRoute, lit('healthz')),
      responseD,
      () => {
        return T.of(response(200, 'OK' as const))
      }
    )

    const result = await runRouteWithHandler(healthz)({
      url: '/healthz',
      method: 'get',
      rawData: {},
      rawHeaders: {},
    })()

    expect(result).toEqual(
      E.right({ code: 200, data: 'OK' })
    )
  })

  it('Uses the healthz handler with wrong return values', async () => {
    const responseD = t.type({
      code: t.literal(200),
      data: t.literal('OK'),
    })

    const healthz = routeWithHandler(
      pipe(getRoute, lit('healthz')),
      responseD,
      () => {
        return T.of(response(500 as any, 'OK' as const))
      }
    )

    const result = await runRouteWithHandler(healthz)({
      url: '/healthz',
      method: 'get',
      rawData: {},
      rawHeaders: {},
    })()

    expect(E.isLeft(result)).toBeTruthy()
  })

  it('Uses a doggy handler', async () => {
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

    const dogAgesHandler = routeWithHandler(
      pipe(
        getRoute,
        lit('dogs'),
        param('age', numberDecoder)
      ),
      dogResponse,
      ({ params: { age } }) => {
        const matchingDogs = Object.entries(dogAges).filter(
          ([_, dogAge]) => dogAge === age
        )
        return matchingDogs.length > 0
          ? T.of(
              response(
                200,
                matchingDogs.map(([name]) => name)
              )
            )
          : T.of(response(400, 'No dogs found'))
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
      E.right({ code: 200, data: ['frank'] })
    )
  })
})
