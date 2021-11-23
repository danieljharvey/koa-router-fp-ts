# koa-router-fp-ts

A new router for [koa](https://koajs.com/) that uses [io-ts](https://gcanti.github.io/io-ts/) validators to check inputs before running to ensure validation is pushed to the very border of your application.

Somewhat inspired by Haskell's [Servant](https://mmhaskell.com/real-world/servant) library.

## Documentation

A sourcefile for OpenAPI documentation is generated automatically and served at a filename of your
choice (this defaults to `swagger.json`). You will need to use Swagger or
Redoc to turn this into readable documentation.

## Simplest example

```typescript
// first we define a `Route`, that is used to match incoming requests
// this should match `GET /healthz` and return a `200` status code along with a `string` response
const healthzRoute = makeRoute(
  get,
  lit('healthz'),
  response(200, t.string)
)

// now we can write a `Handler` for that `Route`. There are no inputs to this handler.
const healthz = routeWithPureHandler(healthzRoute, () =>
  respond(200, 'ok')
)

// we can turn our `Route` / `Handler` into a `Router`...
const router = createRouter([healthz])

// ...create a Koa app
const app = new Koa()

// ...(do the necessary incantations)...
app.use(bodyParser()) // necessary
app.use(serve(router))

// ...and serve our very boring webserver!
const server = app.listen(3000)
```

## A better example

```typescript
// let's parse some input from our route, that would be nice
// `koa-router-ts` uses `io-ts` extensively, so let's invite it to the party
import * as t from 'io-ts'

// this new route should match `GET /user/:id` and return a `200` status code along with a `string` response

// NumberToString is a validator that reads a string and tries to
const userId = param('id', t.NumberFromString)

const getUserRoute = makeRoute(
  get,
  path`/user/${userId}/`,
  response(200, t.string),
  response(500, t.string) // we can add multiple responses to take into account errors etc
)

// now we can write a `Handler` for that `Route`. This time, we are able to access `userId` in the `params` passed to the handler.
// we know that `userId` is a number because if it wasn't the `NumberFromString` validator would have binned it off and returned a `400` error already.
const userHandler = routeWithPureHandler(
  getUserRoute,
  (params: { userId }) =>
    userId !== 666
      ? respond(200, `Found user number ${userId}`)
      : respond(500, 'Found a bad user')
)

// note that the above `getUserRoute` could have been written and would be completely equivalent:
const getUserRoute2 = makeRoute(
  get,
  lit('user'),
  param('userId', t.NumberFromString),
  response(200, t.string),
  response(500, t.string)
)
```

## Parsing post data

```typescript
// this would match `POST /post-me` if you passed `{ name: "Mr Horse", age: 100, likesDogs: true }`
const postRoute = makeRoute(
  post,
  lit('post-me'),
  data(
    t.type({
      name: t.string,
      age: t.number,
      likesDogs: t.boolean,
    })
  ),
  response(200, t.string)
)

const postHandler = routeWithPureHandler(
  postRoute,
  (data: { name; age; likesDogs }) =>
    respond(
      200,
      `Found user called ${name} who is ${
        age / 2
      } years old and ${
        likesDogs ? 'likes dogs' : 'likes dogs'
      }`
    )
)
```

## Returning headers

```typescript
const headersHandler = routeWithPureHandler(
  makeRoute(get, lit('headerz'), response(200, t.string)),
  () =>
    respond(200, 'I am returning some headers', {
      thanks: 'for',
      the: 'headers',
    })
)
```

## Parsing query strings

```typescript
// this would match `GET /things?id=123123`
const getQueryRoute = makeRoute(
  get,
  lit('things'),
  query('id', t.NumberFromString),
  response(200, t.string)
)

// note `id` has type number[] as we may receive multiple query params for `id`.
const queryHandler = routeWithPureHandler(
  getQueryRoute,
  (query: { id }) =>
    respond(
      200,
      `Great job, ${id.map((i) => i * 100).join('-')}`
    )
)
```

## Parsing headers

```typescript
// this would match `GET /things` if the header `authid` = somestuffetc` was passed to it
const getHeaderRoute = makeRoute(
  get,
  lit('things'),
  header('authid', t.string),
  response(200, t.string),
  response(404, t.string)
)

const headerHandler = routeWithEitherHandler(
  getHeaderRoute,
  (headers: { authid }) =>
    authid === 'password'
      ? E.right(respond(200, 'good job'))
      : E.left(respond(404, 'no way!'))
)
```
