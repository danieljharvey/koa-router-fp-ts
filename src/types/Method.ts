import * as O from 'fp-ts/Option'
import * as SG from 'fp-ts/Semigroup'

export type Method =
  | 'GET'
  | 'POST'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'PUT'

// when combining two Option<Method> values, use the last one that is defined
const optionMonoid = O.getMonoid(SG.last<Method>())

export const combineMethod = optionMonoid.concat
