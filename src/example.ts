import { combineRoutes } from './Route'
import {
  lit,
  getRoute,
  param,
  validateHeaders,
  response,
} from './routeCombinators'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { numberDecoder } from './decoders'
import * as T from 'fp-ts/Task'
import {
  HandlerInput,
  HandlerForRoute,
  routeWithHandler,
} from './Handler'

import * as TE from 'fp-ts/TaskEither'

const notAuthResponse = t.type({
  code: t.literal(403),
  data: t.literal('Not authorised'),
})

type NotAuthResponse = t.TypeOf<typeof notAuthResponse>

const userNotFoundResponse = t.type({
  code: t.literal(400),
  data: t.literal('User not found'),
})

type UserNotFoundResponse = t.TypeOf<
  typeof userNotFoundResponse
>

const userResponse = t.type({
  code: t.literal(200),
  data: t.type({
    name: t.string,
    age: t.number,
    requestedBy: t.string,
  }),
})

type UserResponse = t.TypeOf<typeof userResponse>

type AuthCheck = { userName: string }

// there is only one user, return their username if it exists
const checkAuth = ({
  headers: { session },
}: {
  headers: { session: number }
}): TE.TaskEither<NotAuthResponse, AuthCheck> => {
  if (session === 123) {
    return TE.right({ userName: 'mrdog123' })
  }
  return TE.left({
    code: 403,
    data: 'Not authorised' as const,
  })
}

const getUserHandler = ({
  userName,
  params: { id },
}: AuthCheck & UserRouteInput): TE.TaskEither<
  UserNotFoundResponse,
  UserResponse
> => {
  if (id == 100) {
    TE.right({
      code: 200,
      data: {
        name: 'dog',
        age: 100,
        requestedBy: userName,
      },
    })
  }
  return TE.left({
    code: 400,
    data: 'User not found' as const,
  })
}

const getAuthHeaders = combineRoutes(
  validateHeaders(t.type({ session: numberDecoder }))
)

// turn a TaskEither into a Task
const flattenTaskEither = <E, A>(
  teHandler: TE.TaskEither<E, A>
): T.Task<E | A> =>
  pipe(
    teHandler,
    TE.fold(
      e => T.of(e) as T.Task<E | A>,
      a => T.of(a) as T.Task<E | A>
    )
  )

// do one handler and then the other
const chain = <InputA, InputB, Ea, A, Eb, B>(
  teFirst: (input: InputA) => TE.TaskEither<Ea, A>,
  teSecond: (input: InputB & A) => TE.TaskEither<Eb, B>
) => (input: InputA & InputB): TE.TaskEither<Ea | Eb, B> =>
  pipe(
    teFirst(input),
    TE.chainW(a => teSecond({ ...input, ...a }))
  )

const getUserRoute = pipe(
  getRoute,
  getAuthHeaders,
  lit('users'),
  param('id', numberDecoder),
  response(
    t.union([
      userResponse,
      userNotFoundResponse,
      notAuthResponse,
    ])
  )
)

type UserRouteInput = HandlerInput<typeof getUserRoute>
type UserHandler = HandlerForRoute<typeof getUserRoute>

const handler: UserHandler = () => {
  const bigguy = chain(checkAuth, getUserHandler)
  console.log(bigguy)
  return 'poo'
}
export const getUser = routeWithHandler(
  getUserRoute,
  handler
)
