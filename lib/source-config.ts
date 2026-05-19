// lib/source-config.ts
// Single source of truth for all Elvanis data source configuration.
// Used in: signals page (daysUntilNextScan), orchestrator, connect routes.
// Never hardcode source frequencies anywhere else — always import from here.
//
// Same pattern as SIGNAL_GOAL_MAP — one file, zero duplication.

export const SOURCE_CONFIG: Record<string, {
    displayName:        string
    icon:               string
    frequencyFree:      number   // days between auto-scans for free tier
    frequencyNavigator: number   // days between auto-scans for Navigator tier
    isOperational:      boolean  // true = Jira/Intercom (team ops), false = GA4/Shopify/Trustpilot
    uploadOnly:         boolean  // true = CSV (never auto-scanned)
  }> = {
    ga4: {
      displayName:        'Google Analytics',
      icon:               '📊',
      frequencyFree:      30,
      frequencyNavigator: 30,
      isOperational:      false,
      uploadOnly:         false,
    },
    trustpilot: {
      displayName:        'Trustpilot',
      icon:               '⭐',
      frequencyFree:      30,
      frequencyNavigator: 30,
      isOperational:      false,
      uploadOnly:         false,
    },
    shopify: {
      displayName:        'Shopify',
      icon:               '🛍️',
      frequencyFree:      30,
      frequencyNavigator: 30,
      isOperational:      false,
      uploadOnly:         false,
    },
    jira: {
      displayName:        'Jira',
      icon:               '🔧',
      frequencyFree:      30,
      frequencyNavigator: 7,
      isOperational:      true,
      uploadOnly:         false,
    },
    intercom: {
      displayName:        'Intercom',
      icon:               '💬',
      frequencyFree:      30,
      frequencyNavigator: 7,
      isOperational:      true,
      uploadOnly:         false,
    },
    csv: {
      displayName:        'CSV Upload',
      icon:               '📁',
      frequencyFree:      0,
      frequencyNavigator: 0,
      isOperational:      false,
      uploadOnly:         true,
    },
  }
  
  // Helper: get the correct scan frequency for a source given a subscription tier
  export function getSourceFrequency(
    sourceType:        string,
    subscriptionTier:  string,
    dbFrequency?:      number | null   // scan_frequency_days from data_sources row — overrides config if set
  ): number {
    // DB value takes priority — allows per-founder overrides via Supabase
    if (dbFrequency !== null && dbFrequency !== undefined) return dbFrequency
  
    const config      = SOURCE_CONFIG[sourceType]
    const isNavigator = subscriptionTier === 'navigator'
  
    if (!config) return 30  // safe fallback for unknown source types
    if (config.uploadOnly) return 0
  
    return isNavigator ? config.frequencyNavigator : config.frequencyFree
  }