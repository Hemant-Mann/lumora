---
title: 'useRouter'
description: 'A hook to route requests to Lumora handlers'
group: 'Hooks'
---

Provides an Lumora hook that does method + url routing using a trie based on the given url path.

## Install

```sh
yarn add lumora/use-router
# or
yarn add lumora/hooks
```

## Import

```ts
import { useRouter } from 'lumora/use-router'
// or
import { useRouter } from 'lumora/hooks'
```

## Usage

```ts
import https from 'https'
import { error } from 'lumora/core'
import { compose, toInt } from 'radash'
import { useRouter } from 'lumora/hooks'
import { useNode } from 'lumora/use-node'

const server = https.createServer(
  compose(
    useNode(),
    useRouter(router =>
      router
        .put('/v1/library/book/{id}/return', returnBook)
        .post('/v1/library/book', createBook)
        .get('/v1/library/book/{id}', findBook)
        .get('/v1/library/book', listBooks)
    ),
    async () => {
      throw error({
        status: 404,
        message: 'Not found'
      })
    }
  )
)

const port = toInt(process.env.PORT, 8500)

server.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
```
