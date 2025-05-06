---
title: 'useServices'
description: 'A hook inject needed services into an Lumora function'
group: 'Hooks'
---

Provides an Lumora hook that allows for pseudo dependency injection of endpoint function dependencies into the `services` property of the `Props` argument.

## Install

```sh
yarn add lumora/use-services
# or
yarn add lumora/hooks
```

## Import

```ts
import { useServices } from 'lumora/use-services'
// or
import { useServices } from 'lumora/hooks'
```

## Usage

To keep your endpoint functions easy to test, use the `useServices` hook to pass modules that own the interface to an external resources (database, cache, or a third-party app) as a function argument.

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useExpress } from 'lumora/use-express'
import { useServices } from 'lumora/use-services'

type Args = {}
type Services = {
  database: Database
  cache: Cache
  stripe: Stripe
  github: GitHub
}

const setupAccount = ({ services }: Props<Args, Services>) => {
  const { database, cache, stripe, github } = services
  const customer = await database.customers.get()
  const paymentData = await stripe.setup(customer)
  await github.cloneRepository(customer)
  await cache.put(customer)
}

export default compose(
  useExpress(),
  useServices({
    database: () => new Database(),
    cache: () => new Cache(),
    stripe: () => new Stripe(),
    github: () => new GitHub()
  }),
  setupAccount
)
```
