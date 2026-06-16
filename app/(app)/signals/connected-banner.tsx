'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/app/context/LanguageContext'

const SOURCE_NAMES: Record<string, string> = {
  jira:        'Jira',
  ga4:         'Google Analytics',
  trustpilot:  'Trustpilot',
  csv:         'CSV Upload',
}

export default function ConnectedBanner({ connected }: { connected: string }) {
  const t      = useT()
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      router.replace('/signals')
    }, 4000)
    return () => clearTimeout(timer)
  }, [router])

  if (!visible) return null

  const sourceName = SOURCE_NAMES[connected] ?? connected

  return (
    <div style={{
      background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12,
      padding: '12px 20px', marginBottom: 20, display: 'flex',
      alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>✅</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, color: '#065F46', fontWeight: 700, margin: '0 0 2px' }}>
          {t('connect.source_connected').replace('{source}', sourceName)}
        </p>
        <p style={{ fontSize: 13, color: '#059669', margin: 0 }}>
          {t('connect.scanning_now')}
        </p>
      </div>
      <a href="/signals" style={{ fontSize: 13, color: '#059669', fontWeight: 600, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap', marginInlineStart: 8 }}>
        {t('connect.refresh')}
      </a>
    </div>
  )
}
