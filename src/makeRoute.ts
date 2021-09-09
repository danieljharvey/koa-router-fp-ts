import { AnyRoute, CombinedRoute, combine } from './Route';

type CR<A, B> = CombinedRoute<A, B>;

export function makeRoute<A extends AnyRoute>(a: A): A;
export function makeRoute<A extends AnyRoute, B extends AnyRoute>(
  a: A,
  b: B,
): CR<A, B>;
export function makeRoute<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
>(a: A, b: B, c: C): CR<CR<A, B>, C>;
export function makeRoute<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute,
>(a: A, b: B, c: C, d: D): CR<CR<CR<A, B>, C>, D>;
export function makeRoute<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute,
  E extends AnyRoute,
>(a: A, b: B, c: C, d: D, e: E): CR<CR<CR<CR<A, B>, C>, D>, E>;
export function makeRoute<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute,
  E extends AnyRoute,
  F extends AnyRoute,
>(a: A, b: B, c: C, d: D, e: E, f: F): CR<CR<CR<CR<CR<A, B>, C>, D>, E>, F>;
export function makeRoute<
  A extends AnyRoute,
  B extends AnyRoute,
  C extends AnyRoute,
  D extends AnyRoute,
  E extends AnyRoute,
  F extends AnyRoute,
  G extends AnyRoute,
>(
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
): CR<CR<CR<CR<CR<CR<A, B>, C>, D>, E>, F>, G>;

// fold through them all, combining them into one big boy route
export function makeRoute(a: unknown, ...as: unknown[]): unknown {
  return as.reduce((all, val) => combine(all as any, val as any), a);
}
