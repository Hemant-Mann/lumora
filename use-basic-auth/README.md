---
title: 'useBasicAuth'
description: 'A basic authentication hook'
group: 'Hooks'
badge: 'Auth'
---

Provides a Lumora hook function that will parse out the client id and client secret of an incoming request

_NOTE: This hook does not validate the values it parses, you'll need to do that on your own_

## Install

```sh
yarn add lumora/use-basic-auth
# or
yarn add lumora/hooks
```

## Import

```ts
import { useBasicAuth } from 'lumora/use-basic-auth'
// or
import { useBasicAuth } from 'lumora/hooks'
```

## Usage

You can use `useBasicAuth` to parse the client id and client secret from the request. You'll need to validate them yourself.

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useNext } from 'lumora/use-next'
import { useBasicAuth, BasicAuth } from 'lumora/use-basic-auth'

export const securePingEndpoint = async ({
  auth
}: Props<{}, {}, BasicAuth>) => {
  console.log(auth) // { clientId: 'abc', clientSecret: 'abc' }
  return {
    message: 'pong'
  }
}

export default compose(useNext(), useBasicAuth(), securePingEndpoint)
```

In order to keep auth logic out of your endpoints you'll probably want to create a custom hook function to validate
