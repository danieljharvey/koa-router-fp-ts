export const routeLiteral = (literal: string) => ({
  type: 'Literal' as const,
  literal,
})

export const routeParam = (name: string) => ({
  type: 'Param' as const,
  name,
})

export type RouteItem =
  | ReturnType<typeof routeLiteral>
  | ReturnType<typeof routeParam>

const showRouteItem = (routeItem: RouteItem): string => {
  switch (routeItem.type) {
    case 'Literal':
      return routeItem.literal
    case 'Param':
      return `:${routeItem.name}`
    default:
      return explode(routeItem)
  }
}

const explode = (_: never) => {
  throw new Error('Route items are broken somehow')
}

export const showRouteItems = (
  routeItems: RouteItem[]
): string => `/${routeItems.map(showRouteItem).join('/')}`
