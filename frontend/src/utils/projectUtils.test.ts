import { describe, it, expect } from 'vitest'
import { parseCraftDetails } from './projectUtils'

describe('parseCraftDetails', () => {
  it('parses a valid JSON object', () => {
    const result = parseCraftDetails('{"needleSize": "4mm", "gauge": "22 sts"}')
    expect(result).toEqual({ needleSize: '4mm', gauge: '22 sts' })
  })

  it('returns empty object for empty string', () => {
    const result = parseCraftDetails('')
    expect(result).toEqual({})
  })

  it('returns empty object for malformed JSON', () => {
    const result = parseCraftDetails('{invalid json}')
    expect(result).toEqual({})
  })

  it('returns empty object for null-ish JSON string', () => {
    const result = parseCraftDetails('{}')
    expect(result).toEqual({})
  })

  it('handles nested values', () => {
    const result = parseCraftDetails('{"a": "1", "b": "2", "c": "3"}')
    expect(Object.keys(result)).toHaveLength(3)
    expect(result['a']).toBe('1')
  })

  it('returns object with string values', () => {
    const result = parseCraftDetails('{"key": "value"}')
    expect(typeof result['key']).toBe('string')
  })
})
