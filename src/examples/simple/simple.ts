import {
  HandlerInput,
  makeRoute,
  get,
  param,
  lit,
  response,
  numberDecoder,
  routeWithEitherHandler,
  routeWithPureHandler,
} from '../../index'
import * as t from 'io-ts'

import * as E from 'fp-ts/Either'

type User = { name: string; age: number }

const userData: Record<number, User> = {
  100: { name: 'dog', age: 100 },
  200: { name: 'cat', age: 3 },
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
  }),
})

type UserResponse = t.TypeOf<typeof userResponse>

const getUserRoute = makeRoute(
  get,
  lit('user'),
  param('id', numberDecoder),
  response(t.union([userResponse, userNotFoundResponse]))
)

type UserRouteInput = HandlerInput<typeof getUserRoute>

const getUserHandler = ({
  params: { id },
}: UserRouteInput): E.Either<
  UserNotFoundResponse,
  UserResponse
> => {
  const user = userData[id]
  return user
    ? E.right({
        code: 200,
        data: user,
      })
    : E.left({
        code: 400,
        data: 'User not found' as const,
      })
}

export const getUser = routeWithEitherHandler(
  getUserRoute,
  getUserHandler
)

// /users/

const usersResponse = t.type({
  code: t.literal(200),
  data: t.array(
    t.type({
      name: t.string,
      age: t.number,
    })
  ),
})

type UsersResponse = t.TypeOf<typeof usersResponse>

const getUsersRoute = makeRoute(
  get,
  lit('users'),
  response(usersResponse)
)

const getUsersHandler = (): UsersResponse => {
  const users = Object.values(userData)

  return {
    code: 200,
    data: users,
  }
}

export const getUsers = routeWithPureHandler(
  getUsersRoute,
  getUsersHandler
)
