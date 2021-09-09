import * as O from 'fp-ts/Option'

export type Method = 'GET' | 'POST'

const optionMonoid = O.getLastMonoid<Method>()

export const combineMethod = optionMonoid.concat
