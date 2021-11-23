import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
import { pipe, identity } from 'fp-ts/function'
import * as t from 'io-ts'

import { RouteItem } from '../types/RouteItem'
import { Method } from '../types/Method'
import * as D from '../types/Decoder'
import { MatchError, noMatch } from '../types/MatchError'

/* functions mostly used in `matchRoute.ts` */

export const splitUrl = (whole: string): string[] => {
  const pt1 = whole.split('?')[0]
  return pt1.split('/').filter((a) => a.length > 0)
}

type Pair<A> = { fst: A; snd: A }

const splitQueryString = (str: string): Pair<string>[] =>
  str.split('&').reduce((as: Pair<string>[], a: string) => {
    const items = a.split('=')
    if (items[0] && items[1]) {
      const pair = { fst: items[0], snd: items[1] }
      return [...as, pair]
    }
    return as
  }, [])

const flattenQueryParams = (
  queryParams: Pair<string>[]
): Record<string, string[]> =>
  queryParams.reduce((output, { fst: key, snd: val }) => {
    const existing = output[key]
    if (existing) {
      const newVal = [...existing, val]
      return { ...output, [key]: newVal }
    }
    return { ...output, [key]: [val] }
  }, {} as Record<string, string[]>)

// because any of our query or header params may be missing
// we need to appease the validator by providing nice empty array fallbacks for each required item
export const getDefaults = <Query, Default>(
  decoder: D.Decoder<Query>,
  defaultValue: Default
): Record<string, Default> => {
  if (decoder.type === 'NoDecoder') {
    return {}
  }
  const keys =
    // eslint-disable-next-line no-underscore-dangle
    (decoder.decoder as any)._tag === 'InterfaceType'
      ? Object.keys(
          (decoder.decoder as t.InterfaceType<any>).props
        )
      : []

  return keys.reduce(
    (as, a) => ({ ...as, [a]: defaultValue }),
    {}
  )
}

export const parseQueryParams = (
  whole: string
): Record<string, string[]> => {
  const end = whole.split('?')[1]
  return end
    ? flattenQueryParams(splitQueryString(end))
    : {}
}

export const matchMethod = (
  method: O.Option<Method>,
  requestMethod: string
): boolean =>
  pipe(
    method,
    O.map(
      (m) => m.toLowerCase() === requestMethod.toLowerCase()
    ),
    O.fold(() => false, identity)
  )

export const matchRouteItem = (
  routeItem: RouteItem,
  urlPart: string
): E.Either<MatchError, Record<string, string>> => {
  if (routeItem.type === 'Literal') {
    return routeItem.literal.toLowerCase() ===
      urlPart.toLowerCase()
      ? E.right({})
      : E.left(
          noMatch(
            `${urlPart} did not match ${routeItem.literal}`
          )
        )
  }
  return E.right({ [routeItem.name]: urlPart })
}

export const flattenParams = (
  params: readonly Record<string, string>[]
): Record<string, string> =>
  params.reduce((all, a) => ({ ...all, ...a }), {})
