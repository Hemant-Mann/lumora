import { describe, it, expect } from '@jest/globals'
import fs from 'node:fs'

describe('services/index.js', () => {
  // Apps without the optional cloud SDKs must still be able to import the services barrel
  it('should not load the bucket client', () => {
    expect(fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8')).not.toMatch(/from '\.\/bucket\/index\.js'/)
  })
})
