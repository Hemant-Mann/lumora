---
title: 'useRoleAuthorization'
description: 'A role authorization hook'
group: 'Hooks'
badge: 'Auth'
---

Lumora hook to check if a request is authorized given the roles that are attached to it.

## Install

```sh
yarn add lumora/use-role-authorization
# or
yarn add lumora/hooks
```

## Import

```ts
import { useRoleAuthorization } from 'lumora/use-role-authorization'
// or
import { useRoleAuthorization } from 'lumora/hooks'
```

## Usage

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useNext } from 'lumora/use-next'
import { useRoleAuthorization, useTokenAuth } from 'lumora/hooks'
import type { TokenAuth } from 'lumora/hooks'

type Args = {
  id: string
  price: number
}

type Services = {
  db: Database
}

export const updateListing = async ({
  args,
  services
}: Props<Args, Services, TokenAuth>) => {
  const { id, price } = args
  const { db } = services
  await db.listings.update(id, { price })
}

export default compose(
  useNext(),
  useJsonBody(z => ({
    id: z.string(),
    price: z.number()
  })),
  useTokenAuth(config.auth.tokens.secret),
  useRoleAuthorization<Props<Args, {}, TokenAuth>>({
    roles: ({ auth }) => auth.token.roles,
    require: 'admin'
  }),
  useServices<Services>({
    db: () => new Database()
  })
  updateListing
)
```
