import { describe, it, expect } from '@jest/globals'
import { selectMany } from '../mysql/methods.js'

// A stand-in for knex that records the query it was asked to build
const fakeDb = (calls) => () => {
  const q = new Proxy({}, {
    get: (_, name) => name === 'then'
      ? (resolve) => resolve([])
      : (...args) => { calls.push([name, ...args]); return q },
  })
  return q
}

describe('mysql filters', () => {
  it('an empty list matches no rows, not every row', async () => {
    const calls = []
    await selectMany(fakeDb(calls))('member', { _id: [], role: { operator: 'IN', value: [] } })
    expect(calls).toContainEqual(['whereIn', '_id', []])
    expect(calls).toContainEqual(['whereIn', 'role', []])
  })
})
