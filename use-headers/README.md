---
title: 'useHeaders'
description: 'A hook to parse and validate request headers'
group: 'Hooks'
badge: 'Validation'
---

Provides a hook to parse and validate headers in the request.

## Install

```sh
yarn add lumora/use-headers
# or
yarn add lumora/hooks
```

## Import

```ts
import { useHeaders } from 'lumora/use-headers'
// or
import { useHeaders } from 'lumora/hooks'
```

## Import

```ts
import { useHeaders } from 'lumora/use-headers'
import { useHeaders } from 'lumora/hooks'
```

## Usage

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useHeaders } from 'lumora/use-headers'
import { useLambda } from 'lumora/use-lambda'

type Args = {
  'x-request-timestamp': number
  'x-api-key': string
}

const createAccount = async ({ args }: Props) => {
  await db.users.add({
    username: args.username,
    password: args.password
  })
}

export default compose(
  useLambda(),
  useHeaders(z => ({
    'x-request-timestamp': zod.number(),
    'x-api-key': zod.string()
  })),
  createAccount
)
```
