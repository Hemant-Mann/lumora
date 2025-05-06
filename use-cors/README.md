---
title: 'useCors'
description: 'A hook to automatically add CORS headers'
group: 'Hooks'
---

An Lumora hook that automatically responds to `OPTIONS` requests with standard CORS headers. Also allows you to extends and override the headers with your own values as needed.

## Install

```sh
yarn add lumora/use-cors
# or
yarn add lumora/hooks
```

## Import

```ts
import { useCors } from 'lumora/use-cors'
// or
import { useCors } from 'lumora/hooks'
```

## Usage

Add the `useCors` hook anywhere before your endpoint. When an `OPTIONS` request is handled the `useCors` hook will resopnd with the configured (or default) CORS headers and will not call your endpoint function.

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useExpress } from '@exobaes/use-express'
import { useCors } from 'lumora/use-cors'

// Not called when request.method = 'OPTIONS'
const endpoint = (props: Props) => {
  return {
    message: 'success'
  }
}

export default compose(useExpress(), useCors(), endpoint)
```
