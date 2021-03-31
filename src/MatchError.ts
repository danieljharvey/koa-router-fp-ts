import reporter from 'io-ts-reporters'
import * as E from 'fp-ts/Either'
import * as t from 'io-ts'

export const noMatch = (message: string) => ({
  type: 'NoMatchError' as const,
  message,
})

export const validationError = (
  which: 'request' | 'response'
) => (errors: t.Errors) => ({
  type: 'ValidationError' as const,
  which,
  message: reporter.report(E.left(errors)),
})

export type MatchError =
  | ReturnType<typeof noMatch>
  | ReturnType<ReturnType<typeof validationError>>
