// lib/gravity-engine.ts
// Single source of truth for dimension ordering logic (Gravity Model)

export type DimensionId = 
  | 'revenue' 
  | 'customer' 
  | 'marketing' 
  | 'team' 
  | 'product' 
  | 'strategy'

export type FounderStage = 'early_stage' | 'product_customers'
export type FocusMetric  = 'growth' | 'retention' | 'ops' | 'delivery'
export type DimensionState = 'active' | 'secondary' | 'dormant'

export interface DimensionConfig {
  id:          DimensionId
  label:       string
  shortLabel:  string
  icon:        string
  color:       string
  description: string
}

// ── Master dimension definitions ─────────────────────────────
export const DIMENSIONS: Record<DimensionId, DimensionConfig> = {
  revenue: {
    id:          'revenue',
    label:       'Revenue Engine',
    shortLabel:  'Revenue',
    icon:        '💰',
    color:       '#10B981',
    description: 'MRR trends, churn drivers, refund spikes, pricing health',
  },
  customer: {
    id:          'customer',
    label:       'Customer Health',
    shortLabel:  'Customer',
    icon:        '👥',
    color:       '#3B82F6',
    description: 'NPS patterns, complaint clusters, retention, repeat behaviour',
  },
  marketing: {
    id:          'marketing',
    label:       'Growth & Acquisition',
    shortLabel:  'Growth',
    icon:        '📈',
    color:       '#8B5CF6',
    description: 'CAC trends, conversion drop-off, traffic source shifts',
  },
  team: {
    id:          'team',
    label:       'Execution Capacity',
    shortLabel:  'Execution',
    icon:        '⚙️',
    color:       '#F59E0B',
    description: 'Sprint velocity, blockers, cycle time, delivery health',
  },
  product: {
    id:          'product',
    label:       'Product-Market Fit',
    shortLabel:  'PMF',
    icon:        '🎯',
    color:       '#EF4444',
    description: 'PMF signals, activation drop, engagement, bug impact',
  },
  strategy: {
    id:          'strategy',
    label:       'Strategic Clarity',
    shortLabel:  'Strategy',
    icon:        '🧭',
    color:       '#6B7280',
    description: 'ICP drift, decision avoidance, 90-day alignment',
  },
}

// ── Gravity Model — base orders by stage ─────────────────────
const STAGE_ORDER: Record<FounderStage, DimensionId[]> = {
  early_stage: [
    'product',    // PMF is existential at early stage
    'customer',   // Early users are your most valuable signal
    'strategy',   // Direction must be clear before scaling
    'team',       // Execution capacity determines speed
    'marketing',  // Growth before foundation = leaky bucket
    'revenue',    // Revenue is dormant — activates with traction
  ],
  product_customers: [
    'revenue',    // Engine must work — this is the business
    'customer',   // Retention is cheaper than acquisition
    'marketing',  // Growth on a stable base
    'team',       // Execution keeps the engine running
    'product',    // PMF confirmed but must be maintained
    'strategy',   // Direction matters less when engine is working
  ],
}

// ── Focus metric — magnetic pull to #1 ───────────────────────
const FOCUS_PULL: Record<FocusMetric, DimensionId> = {
  growth:    'marketing',
  retention: 'customer',
  ops:       'team',
  delivery:  'product',
}

// ── getDimensionOrder ─────────────────────────────────────────
// Returns ordered array of dimension IDs based on stage + focus metric.
// Focus metric pulls its dimension to #1, shifting rest down.
export function getDimensionOrder(
  founderStage: FounderStage | null,
  focusMetric:  FocusMetric  | null,
): DimensionId[] {
  const stage  = founderStage ?? 'product_customers'
  const base   = [...STAGE_ORDER[stage]]
  const pulled = focusMetric ? FOCUS_PULL[focusMetric] : null

  if (!pulled || base[0] === pulled) return base

  // Remove pulled dimension from current position
  const filtered = base.filter(d => d !== pulled)

  // Insert at position 0
  return [pulled, ...filtered]
}

// ── getDimensionState ─────────────────────────────────────────
// Returns visual state for a dimension card.
// Dormant: revenue for early_stage founders with no revenue signals.
export function getDimensionState(
  dimensionId:  DimensionId,
  founderStage: FounderStage | null,
  hasSignals:   boolean,
): DimensionState {
  if (
    dimensionId  === 'revenue' &&
    founderStage === 'early_stage' &&
    !hasSignals
  ) {
    return 'dormant'
  }
  return 'active'
}

// ── getDimensionScore ─────────────────────────────────────────
// Calculates health score for a single dimension.
// Uses same formula as overall health score but filtered to one dimension.
export function getDimensionScore(
  dimensionId: DimensionId,
  signals: Array<{ dimension: string; severity: string; status: string; source: string }>,
): number {
  const active = signals.filter(s =>
    s.dimension === dimensionId &&
    (s.status === 'new' || s.status === 'acknowledged') &&
    s.source !== 'manual'
  )

  if (active.length === 0) return -1 // No data

  const penalties: Record<string, number> = {
    critical: 15,
    warning:  7,
    watch:    2,
  }

  // Worst penalty only (same as overall formula)
  const worstSeverity = active.reduce((worst, signal) => {
    const penalty = penalties[signal.severity] ?? 0
    return penalty > worst ? penalty : worst
  }, 0)

  return Math.max(0, Math.min(100, 100 - worstSeverity))
}

// ── getAllDimensionScores ──────────────────────────────────────
export function getAllDimensionScores(
  signals: Array<{ dimension: string; severity: string; status: string; source: string }>,
): Record<DimensionId, number> {
  const ids: DimensionId[] = ['revenue', 'customer', 'marketing', 'team', 'product', 'strategy']
  return Object.fromEntries(
    ids.map(id => [id, getDimensionScore(id, signals)])
  ) as Record<DimensionId, number>
}