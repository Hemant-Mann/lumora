---
title: 'useTokenAuth'
description: 'A hook to validate id or access token authentication'
group: 'Auth'
---

Provides an Lumora hook to parse and validate a JWT token in a request. It also includes a utility for generating JWT tokens.

## Install

```sh
yarn add lumora/use-token-auth
# or
yarn add lumora/hooks
```

## Import

```ts
import { useTokenAuth } from 'lumora/use-token-auth'
// or
import { useTokenAuth } from 'lumora/hooks'
```

## Usage

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useTokenAuth } from 'lumora/use-token-auth'

const endpoint = (props: Props) => {
  console.log(props)
}

export default compose(
  useExpress(),
  useTokenAuth({
    type: 'id',
    secret: 'my-little-secret'
  }),
  endpoint
)
```
