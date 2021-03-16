// import * as t from 'io-ts'
import * as D from 'io-ts/Decoder'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

export const routeLiteral = (literal: string) => ({
  type: 'Literal' as const,
  literal,
})

export const routeParam = (name: string) => ({
  type: 'Param' as const,
  name,
})

type RouteItem =
  | ReturnType<typeof routeLiteral>
  | ReturnType<typeof routeParam>

type Method = 'GET' | 'POST'

export type Route<Param> = {
  method: Method
  parts: RouteItem[]
  paramDecoder: D.Decoder<string, Param>
}

const neverDecoder: D.Decoder<string, never> = {
  decode: str =>
    D.failure(str, 'This decoder always fails'),
}

export const combineRoutes = <ParamB>(b: Route<ParamB>) => <
  ParamA
>(
  a: Route<ParamA>
): Route<ParamA | ParamB> => ({
  method: combineMethod(a.method, b.method),
  parts: [...a.parts, ...b.parts],
  paramDecoder: D.union(a.paramDecoder, b.paramDecoder),
})

export const emptyRoute: Route<never> = {
  method: 'GET',
  parts: [],
  paramDecoder: neverDecoder,
}

export const getRoute = emptyRoute

export const postRoute: Route<never> = {
  method: 'POST',
  parts: [],
  paramDecoder: neverDecoder,
}

export const literal = (literal: string): Route<never> => ({
  method: 'GET',
  parts: [routeLiteral(literal)],
  paramDecoder: neverDecoder,
})

export const param = (param: string): Route<never> => ({
  method: 'GET',
  parts: [routeParam(param)],
  paramDecoder: neverDecoder,
})

const methods: Method[] = ['GET', 'POST']

const combineMethod = (a: Method, b: Method): Method => {
  const aIndex = methods.findIndex(i => i === a)
  const bIndex = methods.findIndex(i => i === b)

  if (aIndex === -1 && bIndex === -1) {
    return 'GET'
  }
  const highest = Math.max(aIndex, bIndex)
  return methods[highest]
}

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter(a => a.length > 0)

const matchMethod = (
  method: Method,
  requestMethod: string
) => method.toLowerCase() === requestMethod.toLowerCase()

const matchRouteItem = (
  routeItem: RouteItem,
  urlPart: string
): E.Either<string, Record<string, string>> => {
  switch (routeItem.type) {
    case 'Literal':
      return routeItem.literal.toLowerCase() ===
        urlPart.toLowerCase()
        ? E.right({})
        : E.left(
            `${urlPart} did not match ${routeItem.literal}`
          )
    case 'Param':
      return E.right({ [routeItem.name]: urlPart })
  }
}

const flattenParams = (
  params: readonly Record<string, string>[]
): Record<string, string> =>
  params.reduce((all, a) => ({ ...all, ...a }), {})

export const matchRoute = <Param>(route: Route<Param>) => (
  url: string,
  method: string
): E.Either<string, Record<string, string>> => {
  const items = splitUrl(url)

  const pairs = A.zip(route.parts, items)

  if (
    pairs.length !== route.parts.length ||
    pairs.length !== items.length
  ) {
    return E.left('Route does not match url parts length')
  }

  if (!matchMethod(route.method, method)) {
    return E.left(`Method does not match ${route.method}`)
  }

  return pipe(
    pairs,
    E.traverseArray(([routePart, urlPart]) =>
      matchRouteItem(routePart, urlPart)
    ),
    E.map(flattenParams)
  )
}
