import { describe, it, expect } from '@jest/globals'
import { contentDisposition } from '../bucket/disposition.js'

describe('bucket/disposition.js', () => {
  it('names the file with an ASCII fallback and the full UTF-8 name', () => {
    expect(contentDisposition('Screenshot 9.53 AM.png')).toBe(`inline; filename="Screenshot 9.53 AM.png"; filename*=UTF-8''Screenshot%209.53%20AM.png`)
  })
})
