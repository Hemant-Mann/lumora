---
title: 'useExpress'
description: 'A root hook for the Express.js API framework'
group: 'Root Hooks'
badge: 'Express.js'
---

An Lumora root hook for the ExpressJS framework

## Install

```sh
yarn add lumora/use-express
```

## Usage

```ts
import { compose } from 'radash'
import type { Props } from 'lumora/core'
import { useExpress } from 'lumora/use-express'

const endpoint = (props: Props) => {
  console.log(props)
}

export default compose(useExpress(), endpoint)
```
