export type RevealProfileName = 'eligible' | 'none'

export type EligibilityResult = {
  eligible: boolean
  profile: RevealProfileName
}

export const revealProfiles = {
  eligible: {
    glyph: '✦',
    eyebrow: 'PILOT ACCESS / VERIFIED',
    title: 'ELIGIBLE SOUL',
    description: 'This wallet is on the current pilot list.',
    code: 'ACCESS / OPEN',
    completion: 'Your signal has been recognized.',
  },
  none: {
    glyph: '◌',
    eyebrow: 'SIGNAL CONTINUES',
    title: 'UNWRITTEN',
    description: 'This wallet is not on the current pilot list.',
    code: 'SIGNAL / OPEN',
    completion: 'Your story is still being written.',
  },
} as const

export function parseEligibilityResult(value: unknown): EligibilityResult {
  if (!value || typeof value !== 'object') throw new Error('Check unavailable. Please try again.')
  const result = value as Record<string, unknown>
  if (typeof result.eligible !== 'boolean' || 'tier' in result) throw new Error('Check unavailable. Please try again.')
  return { eligible: result.eligible, profile: result.eligible ? 'eligible' : 'none' }
}
