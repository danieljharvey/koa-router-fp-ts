// import * as t from 'io-ts'
// import * as D from 'io-ts/Decoder'
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

export type Route = RouteItem[]

const splitUrl = (whole: string): string[] =>
  whole.split('/').filter(a => a.length > 0)

const matchRouteItem = (routeItem: RouteItem) => (
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

export const matchRoute = (route: Route) => (
  url: string
): E.Either<string, Record<string, string>> => {
  const items = splitUrl(url)

  const pairs = A.zip(route, items)

  if (
    pairs.length !== route.length ||
    pairs.length !== items.length
  ) {
    return E.left('Route does not match url parts length')
  }

  return pipe(
    pairs,
    E.traverseArray(([routePart, urlPart]) =>
      matchRouteItem(routePart)(urlPart)
    ),
    E.map(flattenParams)
  )
}
