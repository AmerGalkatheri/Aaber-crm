import { describe, expect, it } from 'vitest'
import { assertToolAuthorized, canCallTool } from './ai-tool-permissions'

describe('AI tool permission gate', () => {
  const tool = { name: 'create_booking', permissions: ['booking.write'] }

  it('allows a tool only when every permission is granted', () => {
    expect(canCallTool(tool, ['booking.write'])).toBe(true)
    expect(canCallTool(tool, [])).toBe(false)
  })

  it('rejects unauthorized tool calls', () => {
    expect(() => assertToolAuthorized(tool, [])).toThrow('AI tool not authorized')
  })
})
