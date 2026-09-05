import { describe, expect, it } from 'vitest'
import { decideHandoff } from './ai-handoff'

describe('AI handoff policy', () => {
  it('hands off when customer asks for a human', () => {
    expect(decideHandoff({ requestedHuman: true }).mode).toBe('human')
  })
  it('hands off below confidence threshold', () => {
    expect(decideHandoff({ confidence: 0.4 }).reason).toBe('low_confidence')
  })
  it('hands off on tool failure', () => {
    expect(decideHandoff({ toolFailed: true }).reason).toBe('tool_failure')
  })
  it('keeps AI mode when safe and confident', () => {
    expect(decideHandoff({ confidence: 0.9 }).mode).toBe('ai')
  })
})
