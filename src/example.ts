import { makeRoute } from './makeRoute'
import {
  getRoute,
  validateHeaders,
  withParam,
  withLiteral,
  withResponse,
} from './routeCombinators'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { numberDecoder } from './decoders'
import * as T from 'fp-ts/Task'
import { HandlerInput, routeWithHandler } from './Handler'

import * as TE from 'fp-ts/TaskEither'

// auth shared between endpoints

const notAuthResponse = t.type({
  code: t.literal(403),
  data: t.literal('Not authorised'),
})

type NotAuthResponse = t.TypeOf<typeof notAuthResponse>

// details taken from auth stage and made available later
type AuthUserDetails = { userName: string }

// there is only one user, return their username if it exists
const checkAuth = <
  Input extends { headers: { session: number } }
>(
  input: Input
): TE.TaskEither<
  NotAuthResponse,
  Input & AuthUserDetails
> => {
  if (input.headers.session === 123) {
    return TE.right({ ...input, userName: 'mrdog123' })
  }
  return TE.left({
    code: 403,
    data: 'Not authorised' as const,
  })
}

// /user/:id

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

const getUserRoute = makeRoute(
  getRoute,
  validateHeaders(t.type({ session: numberDecoder })),
  withLiteral('user'),
  withParam('id', numberDecoder),
  withResponse(
    t.union([
      userResponse,
      userNotFoundResponse,
      notAuthResponse,
    ])
  )
)

type UserRouteInput = HandlerInput<typeof getUserRoute>

type User = { name: string; age: number }

const userData: Record<number, User> = {
  100: { name: 'dog', age: 100 },
  200: { name: 'cat', age: 3 },
}

const getUserHandler = ({
  userName,
  params: { id },
}: AuthUserDetails & UserRouteInput): TE.TaskEither<
  UserNotFoundResponse,
  UserResponse
> => {
  const user = userData[id]
  return user
    ? TE.right({
        code: 200,
        data: {
          ...user,
          requestedBy: userName,
        },
      })
    : TE.left({
        code: 400,
        data: 'User not found' as const,
      })
}

export const getUser = routeWithHandler(
  getUserRoute,
  (input) =>
    pipe(
      checkAuth(input),
      TE.chainW(getUserHandler),
      flattenTaskEither
    )
)

// /users/

const usersResponse = t.type({
  code: t.literal(200),
  data: t.array(
    t.type({
      name: t.string,
      age: t.number,
      requestedBy: t.string,
    })
  ),
})

type UsersResponse = t.TypeOf<typeof usersResponse>

const getUsersRoute = makeRoute(
  getRoute,
  validateHeaders(t.type({ session: numberDecoder })),
  withLiteral('users'),
  withResponse(t.union([usersResponse, notAuthResponse]))
)

const getUsersHandler = ({
  userName,
}: AuthUserDetails &
  HandlerInput<
    typeof getUsersRoute
  >): T.Task<UsersResponse> => {
  const users = Object.values(userData).map((user) => ({
    ...user,
    requestedBy: userName,
  }))

  return T.of({
    code: 200,
    data: users,
  })
}

export const getUsers = routeWithHandler(
  getUsersRoute,
  (input) =>
    pipe(
      checkAuth(input),
      TE.chainTaskK(getUsersHandler),
      flattenTaskEither
    )
)

// turn a TaskEither into a Task
const flattenTaskEither = <E, A>(
  teHandler: TE.TaskEither<E, A>
): T.Task<E & A> =>
  pipe(
    teHandler,
    TE.fold(
      (e) => T.of(e) as T.Task<E & A>,
      (a) => T.of(a) as T.Task<E & A>
    )
  )
