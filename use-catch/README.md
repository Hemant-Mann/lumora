---
title: 'useCatch'
description: 'A hook to handle errors'
group: 'Hooks'
badge: 'Error Handling'
---

An Lumora hook that catches errors and gives you a chance to log them, map them, and return something user friendly.

## Install

```sh
yarn add lumora/use-catch
# or
yarn add lumora/hooks
```

## Import

```ts
import { useCatch } from 'lumora/use-catch'
// or
import { useCatch } from 'lumora/hooks'
```

## Usage

You can add the `useCatch` hook anywhere, when an error is thrown below the hook your callback will be called with the error. What your callback returns will become the new response.

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useExpress } from '@exobaes/use-express'
import { useCors } from 'lumora/use-cors'
import { useCatch } from 'lumora/use-catch'

const endpoint = (props: Props) => {
  throw new DatabaseSecretError('The given secret password1 was incorrect')
}

export default compose(
  useExpress(),
  useCatch((props, error) => {
    console.error(error)
    switch (error.name) {
      'EntityNotFound':
        return {
          ...props.response,
          status: 404,
          body: { message: 'The item was not found' }
        }
    }
    return {
      ...props.response,
      status: 500,
      body: { message: 'Unknown error' }
    }
  })
  useCors(),
  endpoint
)
```
