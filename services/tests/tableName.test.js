import { describe, it, expect } from '@jest/globals'
import { getTableName as mysqlTableName } from '../mysql/methods.js'
import { getTableName as postgresTableName } from '../postgres/methods.js'

describe.each([['mysql', mysqlTableName], ['postgres', postgresTableName]])('%s getTableName', (_, getTableName) => {
  it('should snake_case model names', () => {
    expect(getTableName('User')).toBe('user')
    expect(getTableName('UserEvent')).toBe('user_event')
    expect(getTableName('ProductReviewV2')).toBe('product_review_v2')
  })
})
