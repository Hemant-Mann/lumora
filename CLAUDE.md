# CLAUDE.md

This file is for LLM agents working on Lumora. It explains the project from the implementation, not from intended marketing copy. Prefer these notes over assumptions when changing hooks or writing examples.

## Project Model

Lumora is an ESM JavaScript hook framework for building API handlers. The core idea is:

1. A root hook adapts an external framework request into Lumora `Props`.
2. Middle hooks transform `Props`, validate input, authenticate, authorize, cache, log, or route.
3. An endpoint is a plain async function receiving `Props`.
4. A root hook turns the endpoint result or thrown error into a framework response.

The common shape is:

```js
import { compose, res } from './core/index.js';
import { useKoa } from './use-koa/index.js';
import { useRouter } from './use-router/index.js';
import { useServices } from './use-services/index.js';

const getUser = compose(
  useServices({
    users: () => userRepository
  }),
  async ({ request, services }) => {
    const user = await services.users.findById(request.params.id);
    if (!user) return res(404, { message: 'User not found' });
    return { user };
  }
);

const handler = compose(
  useKoa(),
  useRouter(router =>
    router.get('/users/{id}', getUser)
  ),
  async () => res(404, { message: 'Not found' })
);
```

## Core Files

- `core/compose.js`: local `compose(...funcs)`, not Radash compose. It reverses the given functions, wraps from endpoint outward, copies enumerable metadata from inner functions to outer functions, and sets `result.endpoint`.
- `core/hook.js`: identity helper used to make JSDoc type intent clearer. It does not add runtime behavior.
- `core/builder.js`: alternative fluent builder exposed as `lumo()`. Most package examples use `compose` directly.
- `core/props.js`: creates the initial `Props` object with empty `args`, `auth`, `services`, `framework`, default `response`, and a framework-normalized `request`.
- `core/response.js`: converts normal endpoint returns and thrown errors into a Lumora response.
- `core/error.js`: defines `LumoError` plus HTTP-specific subclasses.

## Props Contract

Every hook should treat `Props` as immutable and pass a shallow-copy with nested shallow merges:

```js
return await func({
  ...props,
  args: {
    ...props.args,
    userId
  }
});
```

Main `Props` fields:

- `request`: normalized HTTP request. Includes `headers`, `cookies` in root adapters, `url`, `path`, `body`, `method`, `query`, `params`, `ip`, `startedAt`, `protocol`, and `httpVersion`.
- `args`: validated/request-derived data for business logic. Validation hooks normally write here.
- `auth`: authentication and authorization context. Auth hooks write here.
- `services`: injected dependencies. `useServices` writes here.
- `framework`: framework-specific raw objects, for example `{ ctx, next }` for Koa or `{ req, res }` for Express.
- `response`: initialized to `defaultResponse`, but most hooks call `response(error, result)` instead of mutating this field.

Do not overwrite a whole nested object unless that is deliberate. Merge existing `props.args`, `props.auth`, `props.services`, `props.request.params`, etc.

## Composition Semantics

`compose(a, b, c, endpoint)` produces roughly:

```js
a(b(c(endpoint)))
```

Runtime order starts at the first function. For HTTP usage the first function must usually be a root hook like `useKoa()` or `useExpress()`, because those convert framework arguments into Lumora `Props`.

Important routing nuance:

```js
compose(
  useKoa(),
  useRouter(router => router.get('/x', routeEndpoint)),
  useServices({ db }),
  fallbackEndpoint
);
```

If `useRouter` finds a matching route, it calls the route handler directly and does **not** call the downstream `func`. Therefore hooks placed after `useRouter` do not automatically wrap matched route handlers. If a route needs services/auth/body parsing, either compose those hooks inside the route handler or place routing later in a custom structure that fits the intended behavior.

Example of composing a protected route handler:

```js
const getUser = compose(
  useTokenAuth(process.env.JWT_SECRET),
  useServices({ users: () => userRepository }),
  async ({ request, auth, services }) => {
    return {
      id: request.params.id,
      tokenSubject: auth.token.sub,
      user: await services.users.findById(request.params.id)
    };
  }
);

const appHandler = compose(
  useKoa(),
  useRouter(router => router.get('/users/{id}', getUser)),
  async () => res(404, { message: 'Not found' })
);
```

## Responses And Errors

Endpoint return rules:

```js
return { ok: true };              // body becomes { ok: true }, status 200
return res(201, { id: 'u_1' });   // explicit Lumora response
return res(204);                  // explicit status with empty body
return undefined;                 // default 200 response with {}
```

Thrown `LumoError` subclasses become JSON error responses:

```js
import { NotAuthenticatedError } from './core/index.js';

throw new NotAuthenticatedError('Missing token', {
  key: 'auth.missing-token'
});
```

Unknown errors become status `500` with `{ status: 500, message: 'Unknown Error' }`; root hooks log unknown errors to `console.error`.

`response(error, result)` only accepts `(error, result)`. Do not assume extra status/header arguments are supported unless you update `core/response.js`.

## Root Hooks

### `useKoa(options = {})`

File: `use-koa/useKoa.js`

Signature:

```js
const koaMiddleware = useKoa()(lumoraEndpoint);
```

It creates `Props` from Koa `ctx`, stores `{ ctx, next }` in `framework`, runs the Lumora function, converts result/error with `response()`, and writes `ctx.status`, headers, cookies, and `ctx.body`.

Current `skipJson` and `skipCompression` options exist, but the middleware constants are `false`; they do not currently install JSON or compression middleware.

### `useExpress(options = {})`

File: `use-express/useExpress.js`

Signature:

```js
const expressHandler = useExpress()(lumoraEndpoint);
```

It creates `Props` from Express `req`, stores `{ req, res }` in `framework`, runs the Lumora function, then writes status, headers, cookies, and body. String bodies or `text/plain` responses use `res.send`; otherwise `res.json`.

## Routing And Path Hooks

### `useRouter(routing)`

Files: `use-router/useRouter.js`, `use-router/router.js`, `use-router/trie.js`

Routes are stored in a trie. Parameter segments use braces:

```js
useRouter(router =>
  router
    .get('/libraries/{library}/books/{book}', getBook)
    .post('/libraries/{library}/books', createBook)
);
```

When matched, route params are merged into `props.request.params`. Wildcards are internal trie nodes named `*`; there is no public glob syntax beyond `{param}` segments.

Methods supported by convenience methods: `GET`, `PUT`, `POST`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`. `router.on(methodOrMethods, path, handler)` also accepts a method array.

### `usePathParser(template)`

Parses a template like `/users/{id}` against `props.request.path` and merges parsed values into `props.request.params`. Use it when you are not using `useRouter`.

```js
compose(
  useKoa(),
  usePathParser('/users/{id}'),
  async ({ request }) => ({ id: request.params.id })
);
```

### `usePathParams(shapeMaker)`

Validates `props.request.params` with Zod and merges parsed values into `props.args`.

```js
usePathParams(z => ({
  id: z.string().uuid()
}));
```

## Validation Hooks

Validation hooks use Zod. On validation failure they throw `BadRequestError`.

### `useJsonBody(shapeMaker)`

Validates `props.request.body` as an object and merges parsed fields into `props.args`.

```js
useJsonBody(z => ({
  email: z.string().email(),
  name: z.string().min(1)
}));
```

### `useJsonArrayBody(name, shapeMaker)`

Validates `props.request.body` as an array and stores it under `props.args[name]`.

```js
useJsonArrayBody('items', z =>
  z.object({
    sku: z.string(),
    quantity: z.number().int().positive()
  })
);
```

### `useQueryString(shapeMaker)`

Validates `props.request.query` and merges parsed values into `props.args`.

```js
useQueryString(z => ({
  page: z.coerce.number().int().default(1)
}));
```

### `useHeaders(shapeMaker)`

Validates `props.request.headers` and merges parsed values into `props.args`.

```js
useHeaders(z => ({
  'x-request-id': z.string().optional()
}));
```

Header keys from Node/Express/Koa are usually lower-case.

## Authentication And Authorization

### `useTokenAuth(secret, options = {})`

File: `use-token-auth/useTokenAuth.js`

Reads a Bearer token from `Authorization` by default, verifies it using `jsonwebtoken`, optionally validates `type`, `iss`, and `aud`, then writes the decoded token to `props.auth.token`.

```js
useTokenAuth(
  props => props.services.config.jwtSecret,
  {
    type: 'access',
    iss: 'lumora',
    aud: 'api'
  }
);
```

Use `createToken(secret, token)` from `use-token-auth/token.js` for test/demo tokens. It sets `iat`, computes `exp` from `token.ttl` using `durhuman`, and defaults `permissions`, `roles`, `scopes`, and `extra`.

### `useApiKey(keyOrFunc)`

Reads `x-api-key`. It accepts a raw key or a function returning the expected key. A provided header may be either the raw key or `Key <value>`. On success it writes `props.auth.apiKey`.

```js
useApiKey(props => props.services.config.apiKey);
```

### `useBasicAuth()`

Reads `Authorization: Basic <base64(clientId:clientSecret)>` and writes `props.auth.clientId` and `props.auth.clientSecret`. It only parses credentials; it does not compare them to a database or secret.

### `useRoleAuthorization(options)`

Calls `options.roles(props)` and checks all roles from `options.require`. It does not write to `props.auth`.

```js
useRoleAuthorization({
  roles: props => props.auth.token.roles,
  require: ['admin']
});
```

### `usePermissionAuthorization(options)`

Calls `options.permissions(props)`, builds a permission trie with `cani.user(...)`, verifies required permissions, and writes `props.auth.cani`.

Permission strings are `acl:scope:uri`, for example:

```js
usePermissionAuthorization({
  permissions: props => props.auth.token.permissions,
  require: 'allow:read:/users'
});
```

Denies win over allows when matching related permissions. Scope `*` matches any scope.

## Services

### `useServices(serviceFunctionsByKey)`

Resolves each configured service in parallel with concurrency `10`. Values may be plain objects, promises, sync functions, or async functions. Function services receive current `props`.

```js
useServices({
  db: props => createDb(props.request.headers['x-tenant']),
  config: () => loadConfig(),
  clock: { now: () => new Date() }
});
```

Resolved services are merged into `props.services`.

## Utility Hooks

### `useCachedResponse(options)`

Requires `props.services.cache` with:

```js
{
  get: async key => value,
  set: async (key, value, ttlSeconds) => {}
}
```

It hashes `options.toIdentity(props)` into a stable UUID key, reads cache, returns cached response on hit, otherwise calls the endpoint and stores the response. Cache read/write errors are logged and ignored.

```js
useCachedResponse({
  key: 'users.get',
  ttl: '5 minutes',
  toIdentity: props => ({ id: props.request.params.id }),
  header: 'x-cache-mode',
  value: 'refresh'
});
```

### `useRateLimit(options)`

Requires a rate-limit store either in `options.store` or `props.services.store`:

```js
{
  inc: async key => ({ count: 1, timestamp: Date.now() }),
  reset: async key => {}
}
```

It computes a key from `options.key` and `options.toIdentity(props)`, enforces `options.limit`, and appends `X-RateLimit-*` headers to the response. If `strict: false`, store errors let the request continue.

```js
useRateLimit({
  key: 'login',
  limit: { window: '1 minute', max: 5 },
  toIdentity: props => props.request.ip
});
```

### `useLogging(template, options = {})`

Wraps the endpoint, converts result/error to a response, logs a formatted access message, and returns the response. Default template:

```txt
[:method] :fullpath at :date(iso) -> :status in :elapsed(ms)
```

Built-in token functions include `url`, `domain`, `search`, `path`, `fullpath`, `method`, `elapsed`, `date`, `status`, `referrer`, `ip`, `http-version`, `protocol`, and `user-agent`.

```js
useLogging('[:method] :path -> :status', {
  logger: console,
  tokens: (tokens, props) => ({
    tenant: () => props.request.headers['x-tenant'] ?? 'unknown'
  })
});
```

The formatter currently replaces literal `:${key}` once per token. It does not parse token arguments like `:date(iso)` generically; built-in functions receive no parsed argument unless the replacement code is changed.

### `useCatch(handler)`

Catches errors from downstream, converts them with `response(error, result)`, and calls `handler(props, res)` only when `res.error` is truthy. Since `responseFromError()` sets `error` only for unknown non-`LumoError` errors, this hook does not currently intercept normal `LumoError` subclasses.

```js
useCatch(async (props, res) => {
  props.framework.ctx.app.emit('error', res.error, props.framework.ctx);
  return res;
});
```

### `useCors(config = {})`

Intended to add CORS headers and short-circuit `OPTIONS`, but current implementation calls `response(error, result, ..., corsHeaders)` even though `core/response.js` ignores extra arguments. Treat CORS as needing implementation review before relying on it.

## Common Design Patterns

### Hook Factory Pattern

A hook is normally a function returning a wrapper:

```js
export const useExample = (options) =>
  hook(function useExample(func) {
    return async props => {
      const nextProps = {
        ...props,
        args: {
          ...props.args,
          example: options.value
        }
      };
      return await func(nextProps);
    };
  });
```

Use `hook(...)` for consistency and JSDoc readability. Runtime behavior would be the same without it.

### `withX` Testable Function Pattern

Many hooks split the core behavior into `withX(func, options, props)` and export a tiny `useX(...)` wrapper:

```js
export async function withExample(func, options, props) {
  return await func({ ...props, args: { ...props.args, value: options.value } });
}

export const useExample = options => func => props =>
  withExample(func, options, props);
```

Prefer this pattern when adding non-trivial hooks because it is easier to test directly.

### Validation-To-Args Pattern

Request-derived data validated with Zod goes into `props.args`, not `props.request`.

```js
compose(
  useJsonBody(z => ({ email: z.string().email() })),
  async ({ args }) => ({ email: args.email })
);
```

### Auth-To-Auth Pattern

Authentication writes identity data to `props.auth`; authorization reads that data and may add helpers like `auth.cani`.

```js
compose(
  useTokenAuth(secret),
  usePermissionAuthorization({
    permissions: props => props.auth.token.permissions,
    require: 'allow:read:/reports'
  }),
  endpoint
);
```

### Services-To-Services Pattern

Dependencies go in `props.services`; endpoints should use services instead of importing app-specific singletons.

```js
compose(
  useServices({ users: () => usersRepo }),
  async ({ services }) => services.users.list()
);
```

## Known Implementation Traps

- `README.md` imports `compose` from `radash` in places. In this repository, use `compose` from `core/index.js` when relying on Lumora metadata behavior.
- `useRouter` bypasses downstream hooks on a route match. Compose per-route handlers when matched routes need auth, validation, services, logging, etc.
- `res()` supports status and body only. It does not accept headers or cookies. To add headers, return a full response object or modify `res()`/`response.js`.
- `defaultResponse` is a shared object. Do not mutate it in place.
- `useCors` currently does not attach headers because extra `response()` arguments are ignored.
- `useCatch` only calls its handler for responses with `res.error`, which excludes handled `LumoError` subclasses.
- `useBasicAuth` parses credentials only; it does not authenticate against expected values.
- Root hook JSON/compression options are placeholders because middleware constants are currently `false`.
- All source files are ESM (`"type": "module"`). Use `import`/`export`, include `.js` extensions for relative imports.
- This package uses JSDoc typedefs heavily instead of TypeScript source files. Keep JSDoc precise when changing hook contracts.

## Test Command

```sh
npm test
```

Jest runs through Node's ESM VM modules:

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage
```

## When Adding A Hook

1. Create `use-new-hook/useNewHook.js` and `use-new-hook/index.js`.
2. Export the hook from `hooks/index.js` if it is not a root-only integration hook.
3. Use the existing hook factory or `withX` pattern.
4. Preserve props immutability with shallow copies and nested merges.
5. Throw `LumoError` subclasses for expected HTTP failures.
6. Add focused tests around prop mutation, error behavior, and ordering.
7. Update the hook README and this file with exact examples.
