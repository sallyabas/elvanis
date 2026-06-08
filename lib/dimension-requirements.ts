// lib/dimension-requirements.ts
// Single source of truth for dimension-to-tool mapping.
// Drives all placeholder CTAs, unlock messages, and gamification.

import type { DimensionId } from './gravity-engine'

export interface DimensionRequirement {
  tools:       string[]       // source_type values from data_sources table
  csvTemplate: string | null  // CSV template name if applicable
  ctaText:     string         // Short CTA for compact dimension cards
  ctaHref:     string         // Where CTA links to
  unlockText:  string         // Full message for hero card locked state
  pendingText: string         // Message when tools connected but no scan yet
  healthyText: string         // Message when scanned and no signals (positive)
}

export const DIMENSION_REQUIREMENTS: Record<DimensionId, DimensionRequirement> = {
  revenue: {
    tools:       ['shopify'],
    csvTemplate: 'financial',
    ctaText:     'Connect Shopify or upload financial data',
    ctaHref:     '/connect',
    unlockText:  'Connect Shopify or upload a financial CSV to activate your Revenue Engine.',
    pendingText: 'Run a scan to generate your first Revenue signals.',
    healthyText: 'No revenue issues detected. Your engine looks healthy.',
  },
  customer: {
    tools:       ['intercom', 'trustpilot'],
    csvTemplate: 'satisfaction',
    ctaText:     'Connect Intercom or Trustpilot',
    ctaHref:     '/connect',
    unlockText:  'Connect Intercom or Trustpilot to activate Customer Health signals.',
    pendingText: 'Run a scan to generate your first Customer Health signals.',
    healthyText: 'No customer issues detected. Retention looks healthy.',
  },
  marketing: {
    tools:       ['ga4'],
    csvTemplate: 'marketing',
    ctaText:     'Connect Google Analytics',
    ctaHref:     '/connect',
    unlockText:  'Connect Google Analytics to activate Growth & Acquisition signals.',
    pendingText: 'Run a scan to generate your first Growth signals.',
    healthyText: 'No growth issues detected. Acquisition looks healthy.',
  },
  team: {
    tools:       ['jira'],
    csvTemplate: 'velocity',
    ctaText:     'Connect Jira or upload velocity data',
    ctaHref:     '/connect',
    unlockText:  'Connect Jira or upload a velocity CSV to activate Execution Capacity.',
    pendingText: 'Run a scan to generate your first Execution signals.',
    healthyText: 'No execution issues detected. Delivery looks healthy.',
  },
  product: {
    tools:       ['ga4', 'shopify', 'intercom', 'jira', 'trustpilot'],
    csvTemplate: null,
    ctaText:     'Complete your assessment and connect tools',
    ctaHref:     '/assessment',
    unlockText:  'Complete your assessment to start measuring Product-Market Fit.',
    pendingText: 'Run a scan to generate your first PMF signals.',
    healthyText: 'No PMF issues detected. Product fit looks strong.',
  },
  strategy: {
    tools:       [],
    csvTemplate: null,
    ctaText:     'Complete your assessment',
    ctaHref:     '/assessment',
    unlockText:  'Complete your assessment to activate Strategic Clarity signals.',
    pendingText: 'Run a scan to generate your first Strategy signals.',
    healthyText: 'No strategic issues detected. Direction looks clear.',
  },
}

// ── Helper: get missing tools for a dimension ─────────────────
export function getMissingTools(
  dimensionId:          DimensionId,
  connectedSourceTypes: string[],
): string[] {
  const req = DIMENSION_REQUIREMENTS[dimensionId]
  return req.tools.filter(t => !connectedSourceTypes.includes(t))
}

// ── Helper: check if dimension has relevant tool connected ─────
export function hasDimensionTool(
  dimensionId:          DimensionId,
  connectedSourceTypes: string[],
  hasAssessment:        boolean,
): boolean {
  const req = DIMENSION_REQUIREMENTS[dimensionId]

  if (dimensionId === 'strategy') return hasAssessment
  if (dimensionId === 'product')  return hasAssessment ||
    req.tools.some(t => connectedSourceTypes.includes(t))

  return req.tools.some(t => connectedSourceTypes.includes(t)) ||
         connectedSourceTypes.includes('csv')
}