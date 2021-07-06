import reporter from 'io-ts-reporters'
import * as E from 'fp-ts/Either'
import * as t from 'io-ts'

export type MatchArea =
  | 'headers'
  | 'body'
  | 'query'
  | 'params'

export const noMatch = (message: string) => ({
  type: 'NoMatchError' as const,
  message,
})

export const validationError = (
  which:
    | 'headers'
    | 'body'
    | 'query'
    | 'params'
    | 'response'
) => (errors: t.Errors) => ({
  type: 'ValidationError' as const,
  which,
  message: reporter.report(E.left(errors)),
})

export const noResponseValidator = () => ({
  type: 'NoResponseValidator' as const,
})

export type MatchError =
  | ReturnType<typeof noMatch>
  | ReturnType<ReturnType<typeof validationError>>
  | ReturnType<typeof noResponseValidator>
