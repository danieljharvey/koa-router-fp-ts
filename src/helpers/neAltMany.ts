import { pipe } from 'fp-ts/lib/function'
import * as NE from 'fp-ts/NonEmptyArray'
import * as TE from 'fp-ts/TaskEither'

/**
 *
 * Given a non-empty array of matchable routes/handlers, try them all and return the first passing one or the last failure
 */
export const neAltMany = <E, A>(
  as: NE.NonEmptyArray<TE.TaskEither<E, A>>
): TE.TaskEither<E, A> => {
  const a = NE.head(as) // this will be always be a value
  const rest = NE.tail(as) // this will be an array (that may be empty)

  // we try each ReaderTaskEither in turn
  // if we get a 'NoMatchError' we try another, if not, we return the error
  return rest.reduce(
    (all, val) =>
      pipe(
        all,
        TE.alt(() => val)
      ),
    a
  )
}
