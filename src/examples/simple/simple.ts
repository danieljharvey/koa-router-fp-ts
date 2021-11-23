import * as t from 'io-ts'
import * as E from 'fp-ts/Either'
import * as tt from 'io-ts-types'
import {
  makeRoute,
  get,
  param,
  lit,
  response,
  eitherHandler,
  pureHandler,
  respond,
  HandlerForRoute,
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
  birthday: tt.DateFromISOString,
})

const getUserRoute = makeRoute(
  get,
  lit('user'),
  param('id', tt.NumberFromString),
  response(400, userNotFoundResponse, {
    description: 'The user could not be found',
  }),
  response(200, userResponse)
)

const getUserHandler: HandlerForRoute<
  typeof getUserRoute
> = ({ params: { id } }) => {
  const user = userData[id]
  return user
    ? E.right(respond(200, user))
    : E.left(respond(400, 'User not found'))
}

export const getUser = eitherHandler(
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

const getUsersHandler: HandlerForRoute<
  typeof getUsersRoute
> = () => {
  const users = Object.values(userData)

  return respond(200, users)
}

export const getUsers = pureHandler(
  getUsersRoute,
  getUsersHandler
)
