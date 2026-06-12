#!/usr/bin/env ts-node
/**
 * scripts/check-translation-dupes.ts
 *
 * Detects duplicate translation values across different keys.
 * Run manually:   npx ts-node scripts/check-translation-dupes.ts
 * Run in CI:      Add to package.json scripts: "check:i18n": "ts-node scripts/check-translation-dupes.ts"
 * Pre-commit:     Add to .husky/pre-commit: npm run check:i18n
 *
 * Reports:
 *   - DUPLICATE: same EN + AR value exists under 2+ different keys → candidate for common.*
 *   - MISSING AR: key exists in EN but not in AR (translation gap)
 *   - MISSING EN: key exists in AR but not in EN (orphan)
 */

import * as fs   from 'fs'
import * as path from 'path'

// ── Config ────────────────────────────────────────────────────
const TRANSLATIONS_FILE = path.resolve(__dirname, '../lib/translations.ts')
const IGNORE_NAMESPACES = ['common'] // Don't warn about duplicates within common.* — that's expected
const MIN_LENGTH        = 4          // Ignore very short strings like 'AR', '←', '✓'

// ── Parse translations.ts ─────────────────────────────────────
function parseTranslations(src: string): {
  en: Record<string, string>
  ar: Record<string, string>
} {
  const en: Record<string, string> = {}
  const ar: Record<string, string> = {}

  // Match 'key': 'value' pairs — handles both single and escaped quotes
  const keyValueRe = /'([^']+)':\s*['"]([^'"\\]|\\.)*['"]/g

  // Split into EN and AR blocks by finding the `ar: {` section
  const arStart = src.indexOf('  ar: {')
  const enBlock = src.slice(0, arStart)
  const arBlock = src.slice(arStart)

  function extractPairs(block: string, target: Record<string, string>) {
    // Match 'key': 'value' or 'key': "value"
    const re = /'([a-z][a-z0-9_.]+)':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g
    let m: RegExpExecArray | null
    while ((m = re.exec(block)) !== null) {
      const key = m[1]
      const val = (m[2] ?? m[3] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n')
      target[key] = val
    }
  }

  extractPairs(enBlock, en)
  extractPairs(arBlock, ar)

  return { en, ar }
}

// ── Main ──────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(TRANSLATIONS_FILE)) {
    console.error(`❌ File not found: ${TRANSLATIONS_FILE}`)
    process.exit(1)
  }

  const src = fs.readFileSync(TRANSLATIONS_FILE, 'utf8')
  const { en, ar } = parseTranslations(src)

  const enKeys = Object.keys(en)
  const arKeys = new Set(Object.keys(ar))

  let dupCount     = 0
  let missingArCount = 0
  let missingEnCount = 0
  let warnings: string[] = []

  // ── 1. Find duplicate EN+AR pairs across different keys ──
  // Group keys by their combined EN+AR value fingerprint
  type Entry = { key: string; en: string; ar: string }
  const fingerprints = new Map<string, Entry[]>()

  for (const key of enKeys) {
    const enVal = en[key]
    const arVal = ar[key] ?? ''
    if (enVal.length < MIN_LENGTH) continue

    const ns = key.split('.')[0]
    if (IGNORE_NAMESPACES.includes(ns)) continue

    const fingerprint = `${enVal}|||${arVal}`
    if (!fingerprints.has(fingerprint)) fingerprints.set(fingerprint, [])
    fingerprints.get(fingerprint)!.push({ key, en: enVal, ar: arVal })
  }

  for (const [, entries] of fingerprints) {
    if (entries.length < 2) continue
    dupCount++
    const keys = entries.map(e => e.key).join(', ')
    warnings.push(
      `  DUPLICATE  "${entries[0].en.slice(0, 60)}${entries[0].en.length > 60 ? '…' : ''}"\n` +
      `             Keys: ${keys}\n` +
      `             → Consider moving to common.*`
    )
  }

  // ── 2. Find missing AR translations ──
  for (const key of enKeys) {
    if (!arKeys.has(key)) {
      missingArCount++
      warnings.push(`  MISSING AR  ${key}`)
    }
  }

  // ── 3. Find orphan AR keys (exist in AR but not EN) ──
  for (const key of arKeys) {
    if (!(key in en)) {
      missingEnCount++
      warnings.push(`  MISSING EN  ${key}  (orphan AR key)`)
    }
  }

  // ── Report ────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════')
  console.log('  Elvanis Translation Health Check')
  console.log('══════════════════════════════════════════\n')
  console.log(`  EN keys:      ${enKeys.length}`)
  console.log(`  AR keys:      ${arKeys.size}`)
  console.log(`  Duplicates:   ${dupCount}`)
  console.log(`  Missing AR:   ${missingArCount}`)
  console.log(`  Orphan AR:    ${missingEnCount}`)
  console.log('')

  if (warnings.length === 0) {
    console.log('  ✅ No issues found. Translations are clean.\n')
    process.exit(0)
  }

  // Group warnings by type
  const dupes   = warnings.filter(w => w.includes('DUPLICATE'))
  const missing = warnings.filter(w => w.includes('MISSING AR'))
  const orphans = warnings.filter(w => w.includes('MISSING EN'))

  if (dupes.length > 0) {
    console.log('── Duplicate values (candidates for common.*) ─────────────')
    dupes.forEach(w => console.log(w))
    console.log('')
  }

  if (missing.length > 0) {
    console.log('── Missing Arabic translations ─────────────────────────────')
    missing.forEach(w => console.log(w))
    console.log('')
  }

  if (orphans.length > 0) {
    console.log('── Orphan AR keys (no matching EN key) ─────────────────────')
    orphans.forEach(w => console.log(w))
    console.log('')
  }

  // Exit with error code only for missing translations (breaks CI)
  // Duplicates and orphans are warnings only — they don't block builds
  if (missingArCount > 0 || missingEnCount > 0) {
    console.log('  ❌ Translation gaps detected — fix before merging.\n')
    process.exit(1)
  }

  if (dupCount > 0) {
    console.log('  ⚠️  Duplicate values found — review and consolidate when convenient.\n')
    process.exit(0) // Warning only, doesn't block
  }
}

main()
