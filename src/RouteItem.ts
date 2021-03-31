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


