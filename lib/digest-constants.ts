/**
 * lib/digest-constants.ts
 *
 * Single source of truth for all digest field constraints.
 * Imported by both generate/route.ts (prompt) and plan/page.tsx (UI).
 *
 * Rules:
 *   - Never hardcode these values in prompts or UI — always import from here
 *   - Adding a new dimension = change here only, prompt and UI update automatically
 */

export const DIGEST_DIMENSIONS = [
  'revenue',
  'customer',
  'marketing',
  'team',
  'product',
  'strategy',
] as const

export const DIGEST_EFFORT_LEVELS = [
  'low',
  'medium',
  'high',
] as const

export const DIGEST_CONFIDENCE_LEVELS = [
  'confirmed',
  'unverified',
  'tentative',
  'conflicted',
] as const

export const DIGEST_TIMEFRAMES = [
  'This week',
  'This month',
  'Weeks 9-12',
] as const

export const DIGEST_PHASES = [1, 2, 3] as const

export type DigestDimension      = typeof DIGEST_DIMENSIONS[number]
export type DigestEffortLevel    = typeof DIGEST_EFFORT_LEVELS[number]
export type DigestConfidenceLevel = typeof DIGEST_CONFIDENCE_LEVELS[number]
export type DigestTimeframe      = typeof DIGEST_TIMEFRAMES[number]
export type DigestPhase          = typeof DIGEST_PHASES[number]
