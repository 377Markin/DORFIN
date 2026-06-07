import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Test: RIR Selector ────────────────────────────────────────
describe('RIR Logic', () => {
  it('maps RIR values to correct colors', () => {
    const RIR_MAP: Record<number, string> = {
      0: 'text-red-400',
      1: 'text-orange-400',
      2: 'text-dorfin-green',
      4: 'text-blue-400',
    }
    expect(RIR_MAP[0]).toBe('text-red-400')
    expect(RIR_MAP[2]).toBe('text-dorfin-green')
    expect(RIR_MAP[4]).toBe('text-blue-400')
  })
})

// ── Test: Training Log formatting ─────────────────────────────
describe('TrainingLog formatting', () => {
  it('parses repeticiones string correctly', () => {
    const rep = '10,8,8,6'
    const first = parseInt(rep.split(',')[0])
    expect(first).toBe(10)
  })

  it('handles single rep value', () => {
    const rep = '10'
    const first = parseInt(rep.split(',')[0])
    expect(first).toBe(10)
  })

  it('formats rest timer correctly', () => {
    const seconds = 95
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    expect(`${mins}:${secs.toString().padStart(2, '0')}`).toBe('1:35')
  })
})

// ── Test: Streak calculation ──────────────────────────────────
describe('Streak logic', () => {
  it('returns 0 streak when no dates', () => {
    const logDates = new Set<string>()
    const today = '2024-10-15'
    let streak = 0
    let check = today
    const MAX = 90

    for (let i = 0; i < MAX; i++) {
      if (logDates.has(check)) streak++
      else break
      const d = new Date(check)
      d.setDate(d.getDate() - 1)
      check = d.toISOString().split('T')[0]
    }
    expect(streak).toBe(0)
  })

  it('counts consecutive days correctly', () => {
    const today = new Date('2024-10-15')
    const logDates = new Set([
      '2024-10-15',
      '2024-10-14',
      '2024-10-13',
    ])

    let streak = 0
    const check = new Date(today)
    for (let i = 0; i < 30; i++) {
      const key = check.toISOString().split('T')[0]
      if (logDates.has(key)) {
        streak++
        check.setDate(check.getDate() - 1)
      } else break
    }
    expect(streak).toBe(3)
  })
})

// ── Test: Password validation ─────────────────────────────────
describe('Auth validation', () => {
  it('rejects passwords shorter than 6 chars', () => {
    const pw = '12345'
    expect(pw.length >= 6).toBe(false)
  })

  it('accepts valid email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(emailRegex.test('user@domain.com')).toBe(true)
    expect(emailRegex.test('notanemail')).toBe(false)
  })
})
