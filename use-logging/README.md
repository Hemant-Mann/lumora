---
title: 'useLogging'
description: 'A hook to log request and response information'
group: 'Hooks'
badge: 'Logging'
---

Provides an Lumora hook that will log information about the request given a string of tokens.

This module inspired by [morgan](https://github.com/expressjs/morgan), the logging middleware library for Express.

## Install

```sh
yarn add lumora/use-logging
# or
yarn add lumora/hooks
```

## Import

```ts
import { useLogging } from 'lumora/use-logging'
// or
import { useLogging } from 'lumora/hooks'
```

## Usage

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useNext } from 'lumora/use-next'
import { useLogging } from 'lumora/use-logging'

export const listLibraries = async (props: Props) => {
  return db.libraries.list()
}

export default compose(
  useNext(),
  useLogging(),
  useLogging('[:method] :path at :date(iso) -> :status in :elapsed(ms'),
  useLogging('[:method] :request-id', {
    format: message => JSON.stringify({ message }),
    logger: console,
    tokens: (l, p, e, r) => ({
      'request-id': () => p.request.headers['x-request-id']
    })
  }),
  listLibraries
)
```
