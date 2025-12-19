# Lumora

A JavaScript framework implementing the **Abstract & Compose** design pattern for building composable, testable API endpoints.

## Installation

```sh
npm install lumora
# or
yarn add lumora
```

## Quick Start

Lumora uses a composable hook system where you chain together hooks to build your endpoints. Here's a simple example using Koa:

```js
import Koa from 'koa'
import { compose } from 'radash'
import { useKoa } from 'lumora/use-koa'
import type { Props } from 'lumora/core'

const app = new Koa()

// Define your endpoint
const helloWorld = async ({ request }: Props) => {
  return {
    message: `Hello from ${request.path}!`,
    method: request.method
  }
}

// Compose hooks together
const handler = compose(
  useKoa(),
  helloWorld
)

// Use with Koa
app.use(handler)

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## Using useKoa

The `useKoa` hook is a root hook that integrates Lumora with the Koa framework. It extracts request information and provides it to your endpoint functions.

### Basic Example

```js
import Koa from 'koa'
import { compose } from 'radash'
import { useKoa } from 'lumora/use-koa'
import type { Props } from 'lumora/core'

const app = new Koa()

const getUser = async ({ request, framework }: Props) => {
  const { ctx } = framework // Access to Koa context
  
  // Access request data
  const userId = request.params.id
  const query = request.query
  
  // Your business logic here
  const user = await fetchUser(userId)
  
  return {
    user,
    timestamp: new Date().toISOString()
  }
}

app.use(
  compose(
    useKoa(),
    getUser
  )
)
```

### With Additional Hooks

You can chain multiple hooks together to add functionality:

```js
import Koa from 'koa'
import { compose } from 'radash'
import { useKoa } from 'lumora/use-koa'
import { useRouter } from 'lumora/use-router'
import { useServices } from 'lumora/use-services'
import { useTokenAuth } from 'lumora/use-token-auth'
import type { Props } from 'lumora/core'

const app = new Koa()

// Define your endpoint
const getBook = async ({ request, services, auth }: Props) => {
  const { database } = services
  const book = await database.books.findById(request.params.id)
  
  return {
    book,
    requestedBy: auth.userId
  }
}

// Compose with multiple hooks
const handler = compose(
  useKoa(),
  useRouter(router =>
    router.get('/api/books/{id}', getBook)
  ),
  useTokenAuth({
    secret: process.env.JWT_SECRET
  }),
  useServices({
    database: () => new Database()
  }),
  async () => {
    throw error({ status: 404, message: 'Not found' })
  }
)

app.use(handler)
```

## Architecture

Lumora follows the **Abstract & Compose** pattern where:

1. **Root Hooks** (like `useKoa`, `useExpress`) integrate with web frameworks
2. **Hooks** add functionality (auth, routing, services, etc.)
3. **Endpoints** are pure functions that receive `Props` and return data

### Props Object

Every endpoint receives a `Props` object containing:

- `request` - Parsed request information (headers, body, query, params, etc.)
- `services` - Injected services (database, cache, etc.)
- `auth` - Authentication information
- `args` - Additional arguments
- `framework` - Framework-specific objects (Koa ctx, Express req/res, etc.)
- `response` - Response helpers

### Composing Hooks

Hooks are composed using `compose` from `radash` (or similar). The composition order matters - hooks are applied from top to bottom:

```js
compose(
  useKoa(),              // 1. Extract request from Koa
  useRouter(...),        // 2. Route to specific handlers
  useTokenAuth(...),     // 3. Authenticate the request
  useServices(...),      // 4. Inject services
  yourEndpoint          // 5. Your business logic
)
```

## Available Hooks

### Root Hooks

- **`useKoa`** - Integration with Koa framework
- **`useExpress`** - Integration with Express.js framework

### Routing

- **`useRouter`** - Method + URL routing using a trie-based router
- **`usePathParser`** - Parse path parameters
- **`usePathParams`** - Extract path parameters

### Authentication & Authorization

- **`useTokenAuth`** - JWT token authentication
- **`useApiKey`** - API key authentication
- **`useBasicAuth`** - Basic HTTP authentication
- **`useRoleAuthorization`** - Role-based authorization
- **`usePermissionAuthorization`** - Permission-based authorization

### Request Processing

- **`useJsonBody`** - Parse JSON request body
- **`useQueryString`** - Parse query string parameters
- **`useHeaders`** - Access and modify headers

### Services & Utilities

- **`useServices`** - Dependency injection for services
- **`useCors`** - CORS handling
- **`useRateLimit`** - Rate limiting
- **`useCachedResponse`** - Response caching
- **`useLogging`** - Request/response logging
- **`useCatch`** - Error handling

## Examples

### Complete API Example with Koa

```js
import Koa from 'koa'
import { compose } from 'radash'
import { useKoa } from 'lumora/use-koa'
import { useRouter } from 'lumora/use-router'
import { useServices } from 'lumora/use-services'
import { useTokenAuth } from 'lumora/use-token-auth'
import { useJsonBody } from 'lumora/use-json-body'
import { error } from 'lumora/core'
import type { Props } from 'lumora/core'

const app = new Koa()

// Define endpoints
const listBooks = async ({ services }: Props) => {
  const { database } = services
  const books = await database.books.findAll()
  return { books }
}

const createBook = async ({ request, services, auth }: Props) => {
  const { database } = services
  const book = await database.books.create({
    ...request.body,
    createdBy: auth.userId
  })
  return { book, status: 201 }
}

const getBook = async ({ request, services }: Props) => {
  const { database } = services
  const book = await database.books.findById(request.params.id)
  if (!book) {
    throw error({ status: 404, message: 'Book not found' })
  }
  return { book }
}

// Compose the API
const api = compose(
  useKoa(),
  useRouter(router =>
    router
      .get('/api/books', listBooks)
      .post('/api/books', createBook)
      .get('/api/books/{id}', getBook)
  ),
  useTokenAuth({ secret: process.env.JWT_SECRET }),
  useJsonBody(),
  useServices({
    database: () => new Database()
  }),
  async () => {
    throw error({ status: 404, message: 'Not found' })
  }
)

app.use(api)
app.listen(3000)
```

### Using with Express

```js
import express from 'express'
import { compose } from 'radash'
import { useExpress } from 'lumora/use-express'
import { useRouter } from 'lumora/use-router'
import type { Props } from 'lumora/core'

const app = express()

const endpoint = async ({ request }: Props) => {
  return {
    message: 'Hello from Express!',
    path: request.path
  }
}

app.use(
  compose(
    useExpress(),
    useRouter(router =>
      router.get('/api/hello', endpoint)
    )
  )
)

app.listen(3000)
```

## Response Handling

Endpoints can return:

1. **Plain objects** - Automatically converted to JSON responses
2. **Response objects** - Full control over status, headers, and body
3. **Errors** - Thrown errors are automatically converted to error responses

```js
import { response, error } from 'lumora/core'

// Plain object (200 OK, JSON)
const getData = async () => {
  return { data: 'value' }
}

// Response object (full control)
const customResponse = async () => {
  return response({
    status: 201,
    headers: { 'X-Custom': 'value' },
    body: { created: true }
  })
}

// Error response
const notFound = async () => {
  throw error({
    status: 404,
    message: 'Resource not found'
  })
}
```

## TypeScript Support

Lumora is written in JavaScript with JSDoc types, but you can use TypeScript by importing types:

```ts
import type { Props } from 'lumora/core'
import { useKoa } from 'lumora/use-koa'

type Services = {
  database: Database
  cache: Cache
}

const endpoint = async ({ services }: Props<{}, Services>) => {
  const { database, cache } = services
  // TypeScript knows about your services
}
```

## Learn More

- [Core Package Documentation](./core/README.md) - Core types and utilities
- [Hooks Documentation](./hooks/README.md) - All available hooks
- Individual hook READMEs in each `use-*` directory

## License

MIT

