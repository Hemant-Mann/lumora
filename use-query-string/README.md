---
title: 'useQueryString'
description: 'A hook to parse and validate a request query string'
group: 'Hooks'
badge: 'Validation'
---

Provides a hook to parse and validate query string values in the request.

## Install

```sh
yarn add lumora/use-query-string
# or
yarn add lumora/hooks
```

## Import

```ts
import { useQueryString } from 'lumora/use-query-string'
// or
import { useQueryString } from 'lumora/hooks'
```

## Usage

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useQueryString } from 'lumora/use-query-string'
import { useLambda } from 'lumora/use-lambda'

type Args = {
  id: number
  format: 'basic' | 'detailed'
}

const getAccount = async ({ args }: Props) => {
  const { id, format } = args
  const account = await db.accounts.find(id)
  return format === 'basic'
    ? mappers.Account.basic(account)
    : mappers.Account.detailed(account)
}

export default compose(
  useLambda(),
  useQueryString(z => ({
    id: zod.string(),
    format: zod.string()
  })),
  getAccount
)
```
