import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Words/acronyms allowed to appear in Latin script within Arabic text
const ALLOWED_LATIN_TERMS = new Set([
  'csv', 'sku', 'api', 'crm', 'nps', 'csat', 'aov', 'mrr', 'kpi', 'cac', 'ltv', 'roas', 'cpl',
  'ga4', 'shopify', 'jira', 'intercom', 'trustpilot', 'google analytics', 'elvanis',
])

function findLeakedWords(arabicText: string): string[] {
  if (!arabicText) return []
  const latinRuns = arabicText.match(/[A-Za-z]{3,}/g) ?? []
  const leaked = latinRuns.filter(word => !ALLOWED_LATIN_TERMS.has(word.toLowerCase()))
  return [...new Set(leaked)]
}

function hasIncompleteSteps(howText: string): boolean {
    if (!howText) return false
  
    const hasNewlines = howText.includes('\n')
  
    if (hasNewlines) {
      // Primary path: steps are newline-separated — check each line's prefix strictly
      const lines = howText.split('\n').map(l => l.trim()).filter(Boolean)
      const stepNumbers: number[] = []
  
      for (const line of lines) {
        const match = line.match(/^(\d+)[.)]\s*/)
        if (match) {
          stepNumbers.push(parseInt(match[1], 10))
          const content = line.replace(/^(\d+)[.)]\s*/, '').trim()
          if (content.length < 3) return true // step exists but is empty/broken
        }
      }
  
      if (stepNumbers.length === 0) {
        // No line had a valid step prefix even though newlines exist —
        // fall through to the no-newline scan below as a safety net
      } else {
        const maxStep = Math.max(...stepNumbers)
        for (let i = 1; i <= maxStep; i++) {
          if (!stepNumbers.includes(i)) return true
        }
        return false
      }
    }
  
    // Fallback path: no newlines, OR newlines present but no line-prefix steps found.
    // Scan the whole string, but require the number be followed by '.' or ')'
    // immediately (not just any whitespace) to avoid matching embedded numbers
    // like "order count > 3" or "at least 10%".
    const stepMatches = [...howText.matchAll(/(\d+)[.)]\s*([^]*?)(?=\d+[.)]\s|$)/g)]
    if (stepMatches.length === 0) return false
  
    const stepNumbers = stepMatches.map(m => parseInt(m[1], 10))
    const maxStep = Math.max(...stepNumbers)
    for (let i = 1; i <= maxStep; i++) {
      if (!stepNumbers.includes(i)) return true
    }
    for (const match of stepMatches) {
      if ((match[2]?.trim() ?? '').length < 3) return true
    }
  
    return false
  }

/**
 * Validates and, if needed, retranslates a single Arabic text field.
 * Retries exactly once via Groq. If still broken, returns the English
 * fallback instead of mixed-language Arabic text.
 * Logs every retry/fallback to system_alerts for visibility — never blocks saving.
 */
export async function validateArabicField(params: {
  admin: ReturnType<typeof import('@/lib/supabase-server').createAdminClient>
  founderId: string | null
  fieldLabel: string
  englishText: string
  arabicText: string
}): Promise<string> {
  const { admin, founderId, fieldLabel, englishText, arabicText } = params

  const leaked = findLeakedWords(arabicText)
  if (leaked.length === 0) return arabicText

  console.warn(`[content-validator] leaked words in ${fieldLabel}: ${leaked.join(', ')} — retrying translation`)

  try {
    const retryResponse = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You are a professional Arabic business translator. Translate the given English text into professional Gulf/MSA Arabic. Do NOT leave any English words untranslated except these exact terms which must stay in English: CSV, SKU, API, CRM, NPS, CSAT, AOV, MRR, KPI, CAC, LTV, ROAS, CPL, GA4, Shopify, Jira, Intercom, Trustpilot, Google Analytics, Elvanis. Respond with ONLY the translated text, no preamble, no quotes, no explanation.',
        },
        { role: 'user', content: englishText },
      ],
    })

    const retryText = retryResponse.choices[0]?.message?.content?.trim() ?? ''
    const retryLeaked = findLeakedWords(retryText)

    await logAlert(admin, founderId, 'data_error',
      `Translation retry for "${fieldLabel}". Original leaked words: ${leaked.join(', ')}. ` +
      `Retry ${retryLeaked.length === 0 ? 'SUCCEEDED' : `still has leaks: ${retryLeaked.join(', ')} — falling back to English`}.`
    )

    if (retryText && retryLeaked.length === 0) return retryText
    return englishText // fallback — never show mixed-language text to founder

  } catch (err) {
    console.error('[content-validator] retry call failed:', err)
    await logAlert(admin, founderId, 'data_error', `Translation retry call failed for "${fieldLabel}": ${String(err)}. Falling back to English.`)
    return englishText
  }
}

/**
 * Validates a numbered "how" field for complete sequential steps.
 * Retries generation once via Groq if incomplete. Falls back to
 * stripping numbering (plain paragraph) if still broken after retry.
 */
export async function validateSteppedField(params: {
  admin: ReturnType<typeof import('@/lib/supabase-server').createAdminClient>
  founderId: string | null
  fieldLabel: string
  howText: string
  context: string // brief context so retry can regenerate sensibly
}): Promise<string> {
  const { admin, founderId, fieldLabel, howText, context } = params

  if (!hasIncompleteSteps(howText)) return howText

  console.warn(`[content-validator] incomplete steps in ${fieldLabel} — retrying generation`)

  try {
    const retryResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You write 3-4 numbered implementation steps for a business action plan. Every step number from 1 to the final step MUST be present with real, non-empty content. Never skip a step number. Respond with ONLY the numbered steps as plain text, no preamble.',
        },
        { role: 'user', content: `Context: ${context}\n\nWrite complete numbered steps (re-doing this because the previous attempt had a gap): ${howText}` },
      ],
    })

    const retryText = retryResponse.choices[0]?.message?.content?.trim() ?? ''

    await logAlert(admin, founderId, 'data_error',
      `Step-completeness retry for "${fieldLabel}". ${hasIncompleteSteps(retryText) ? 'Retry STILL incomplete — falling back to plain text.' : 'Retry succeeded.'}`
    )

    if (retryText && !hasIncompleteSteps(retryText)) return retryText

    // Fallback: convert numbered steps to bullet points with line breaks —
    // more readable than a dense paragraph, and correctly consumes each full
    // number marker (digit + separator) so no orphaned digits remain.
    const bulletPoints = howText
      .split(/(?=\d+[.\s])/)
      .map(chunk => chunk.replace(/^\d+[.\s]+/, '').trim())
      .filter(chunk => chunk.length > 0)
      .map(chunk => `• ${chunk}`)
      .join('\n')
    return bulletPoints || howText

} catch (err) {
    console.error('[content-validator] step retry call failed:', err)
    await logAlert(admin, founderId, 'data_error', `Step retry call failed for "${fieldLabel}": ${String(err)}. Falling back to bulleted text.`)
    const bulletPoints = howText
      .split(/(?=\d+[.\s])/)
      .map(chunk => chunk.replace(/^\d+[.\s]+/, '').trim())
      .filter(chunk => chunk.length > 0)
      .map(chunk => `• ${chunk}`)
      .join('\n')
    return bulletPoints || howText
  }
}

async function logAlert(
  admin: ReturnType<typeof import('@/lib/supabase-server').createAdminClient>,
  founderId: string | null,
  alertType: 'stale_scan' | 'cron_failure' | 'data_error',
  message: string
): Promise<void> {
  try {
    await admin.from('system_alerts').insert({ founder_id: founderId, alert_type: alertType, message })
  } catch (err) {
    console.error('[content-validator] failed to log alert (non-fatal):', err)
  }
}

/**
 * Validates an array of objects has the expected length and that each
 * item's required fields are non-empty. Does NOT retry/regenerate —
 * arrays like top_3_findings are harder to safely regenerate in isolation
 * (would need full re-prompting context). Instead: logs the issue and
 * returns the array filtered to only complete, valid items, so the founder
 * never sees a blank or broken entry — just possibly fewer items than expected.
 */
export async function validateArrayCompleteness(params: {
  admin: ReturnType<typeof import('@/lib/supabase-server').createAdminClient>
  founderId: string | null
  fieldLabel: string
  items: Array<Record<string, unknown>>
  expectedLength: number
  requiredFields: string[]
}): Promise<Array<Record<string, unknown>>> {
  const { admin, founderId, fieldLabel, items, expectedLength, requiredFields } = params

  if (!Array.isArray(items)) {
    await logAlert(admin, founderId, 'data_error', `${fieldLabel}: expected an array, got ${typeof items}.`)
    return []
  }

  const validItems = items.filter(item =>
    requiredFields.every(field => {
      const val = item[field]
      return val !== null && val !== undefined && String(val).trim().length >= 3
    })
  )

  if (validItems.length < expectedLength) {
    await logAlert(admin, founderId, 'data_error',
      `${fieldLabel}: expected ${expectedLength} complete item(s), found ${validItems.length} valid out of ${items.length} total. ` +
      `Dropped ${items.length - validItems.length} incomplete item(s).`
    )
  }

  return validItems
}