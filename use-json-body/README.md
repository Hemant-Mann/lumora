---
title: 'useJsonBody'
description: 'A hook to parse and validate a request body'
group: 'Hooks'
badge: 'Validation'
---

Provides a hook to parse and validate request arguments from the json body.

## Install

```sh
yarn add lumora/use-json-body
# or
yarn add lumora/hooks
```

## Import

```ts
import { useJsonBody } from 'lumora/use-json-body'
// or
import { useJsonBody } from 'lumora/hooks'
```

## Usage

If you're writing Lumora endpoints in Typescript you'll want to import the `Props` type.

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useJsonBody } from 'lumora/use-json-body'
import { useLambda } from 'lumora/use-lambda'

type Args = {
  username: string
  password: string
}

const createAccount = async ({ args }: Props) => {
  // await db.users.add({
  //   username: args.username,
  //   password: args.password
  // })
}

const STRONG = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/

export default compose(
  useLambda(),
  useJsonBody(z => ({
    username: z.string(),
    password: z.string().refine(p => STRONG.test(p), {
      message: 'Password is too weak'
    })
  })),
  createAccount
)
```
