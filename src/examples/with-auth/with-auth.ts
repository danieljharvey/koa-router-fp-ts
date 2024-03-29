import { flow } from 'fp-ts/function'
import * as t from 'io-ts'
import * as T from 'fp-ts/Task'
import * as TE from 'fp-ts/TaskEither'

import {
  HandlerInput,
  routeWithTaskEitherHandler,
  makeRoute,
  get,
  headers,
  param,
  lit,
  response,
  numberDecoder,
  respond,
} from '../../index'

// auth shared between endpoints

const notAuthResponse = t.literal('Not authorised')

// details taken from auth stage and made available later
type AuthUserDetails = { userName: string }

// there is only one user, return their username if it exists
const checkAuth = <
  Input extends { headers: { session: number } }
>(
  input: Input
) => {
  if (input.headers.session === 123) {
    return TE.right({ ...input, userName: 'mrdog123' })
  }
  return TE.left(respond(403, 'Not authorised' as const))
}

// /user/:id

const userNotFoundResponse = t.literal('User not found')

const userResponse = t.type({
  name: t.string,
  age: t.number,
  requestedBy: t.string,
})

const getUserRoute = makeRoute(
  get,
  headers(t.type({ session: numberDecoder })),
  lit('user'),
  param('id', numberDecoder),
  response(403, notAuthResponse),
  response(200, userResponse),
  response(400, userNotFoundResponse)
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
}: AuthUserDetails & UserRouteInput) => {
  const user = userData[id]
  return user
    ? TE.right(
        respond(200, {
          ...user,
          requestedBy: userName,
        })
      )
    : TE.left(respond(400, 'User not found' as const))
}

export const getUser = routeWithTaskEitherHandler(
  getUserRoute,
  flow(checkAuth, TE.chainW(getUserHandler))
)

// /users/

const usersResponse = t.array(
  t.type({
    name: t.string,
    age: t.number,
    requestedBy: t.string,
  })
)

const getUsersRoute = makeRoute(
  get,
  headers(t.type({ session: numberDecoder })),
  lit('users'),
  response(403, notAuthResponse, {
    description:
      'Returned when user is not authorised to access this API',
  }),
  response(200, usersResponse)
)

const getUsersHandler = ({
  userName,
}: AuthUserDetails &
  HandlerInput<typeof getUsersRoute>) => {
  const users = Object.values(userData).map((user) => ({
    ...user,
    requestedBy: userName,
  }))

  return T.of(respond(200, users))
}

export const getUsers = routeWithTaskEitherHandler(
  getUsersRoute,
  flow(checkAuth, TE.chainTaskK(getUsersHandler))
)
