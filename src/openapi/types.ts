import { OpenAPIV3 } from 'openapi-types'

import * as Arr from 'fp-ts/Array'
import * as SE from 'fp-ts-contrib/StateEither'
import * as E from 'fp-ts/Either'
import * as Ap from 'fp-ts/Apply'

export type PathItem = {
  url: string
  pathItem: OpenAPIV3.PathItemObject<{}>
}

export type NamedSchema = {
  name: string
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
}

export type OpenAPIState = {
  schemas: NamedSchema[]
}

export type OpenAPIM<A> = SE.StateEither<
  OpenAPIState,
  string,
  A
>

export const initialState: OpenAPIState = {
  schemas: [],
}

export const pure = <A>(a: A): OpenAPIM<A> => SE.right(a)

export const throwError = (err: string): OpenAPIM<never> =>
  SE.left(err)

export const sequenceStateEitherArray: <A>(
  as: OpenAPIM<A>[]
) => OpenAPIM<A[]> = Arr.sequence(SE.Applicative)

export const sequenceT = Ap.sequenceT(SE.Apply)

// add a schema to the state
export const addSchema = (
  schema: NamedSchema
): OpenAPIM<void> =>
  SE.modify((state: OpenAPIState) => ({
    ...state,
    schemas: [...state.schemas, schema],
  }))

// run the state computation
export const toEither = <S, E, A>(
  stateEither: SE.StateEither<S, E, A>,
  initialState: S
): E.Either<E, [A, S]> => stateEither(initialState)

export const evaluate = <E, A>(
  stateEither: SE.StateEither<OpenAPIState, E, A>
): E.Either<E, A> => SE.evalState(stateEither, initialState)
