import * as t from 'io-ts'
import * as E from 'fp-ts/Either'
import { DateFromISOString } from 'io-ts-types'

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
  respond,
} from '../../index'

type User = { name: string; age: number; birthday: Date }

const sampleDate = new Date(2020, 1, 1, 1, 1, 1)

const userData: Record<number, User> = {
  100: { name: 'dog', age: 100, birthday: sampleDate },
  200: { name: 'cat', age: 3, birthday: sampleDate },
}

// /user/:id

const userNotFoundResponse = t.string

const userResponse = t.type({
  name: t.string,
  age: t.number,
  birthday: DateFromISOString,
})

const getUserRoute = makeRoute(
  get,
  lit('user'),
  param('id', numberDecoder),
  response(
    400,
    userNotFoundResponse,
    'User not found',
    'The user could not be found'
  ),
  response(200, userResponse, {
    name: 'Mr Dog',
    age: 100,
    birthday: '1981-01-01',
  })
)

type UserRouteInput = HandlerInput<typeof getUserRoute>

const getUserHandler = ({
  params: { id },
}: UserRouteInput) => {
  const user = userData[id]
  return user
    ? E.right(respond(200, user))
    : E.left(respond(400, 'User not found'))
}

export const getUser = routeWithEitherHandler(
  getUserRoute,
  getUserHandler
)

// /users/

const usersResponse = t.array(
  t.type({
    name: t.string,
    age: t.number,
  })
)

const getUsersRoute = makeRoute(
  get,
  lit('users'),
  response(200, usersResponse)
)

const getUsersHandler = () => {
  const users = Object.values(userData)

  return respond(200, users)
}

export const getUsers = routeWithPureHandler(
  getUsersRoute,
  getUsersHandler
)

// post user
