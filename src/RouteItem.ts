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
  }
}

export const showRouteItems = (
  routeItems: RouteItem[]
): string => '/' + routeItems.map(showRouteItem).join('/')
