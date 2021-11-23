import * as t from 'io-ts'
import { pipe } from 'fp-ts/function'
import * as E from 'fp-ts/Either'

import { eitherHandler } from './handlers'
import { response, lit } from './routeCombinators'
import { get } from './httpMethods'
import { makeRoute } from './makeRoute'
import { createOpenAPISpec } from './openapi/openapi'
import { Router } from './types/Router'
import { respond } from './respond'

const openAPIRoute = (openAPIPath: string) =>
  makeRoute(
    get,
    lit(openAPIPath),
    response(200, t.unknown),
    response(500, t.string)
  )

export const openAPIHandler = (router: Router) =>
  eitherHandler(
    openAPIRoute(router.openAPIPath),

    () =>
      pipe(
        createOpenAPISpec(router),
        E.bimap(
          (e) => respond(500, e),
          (json) => respond(200, json)
        )
      )
  )
