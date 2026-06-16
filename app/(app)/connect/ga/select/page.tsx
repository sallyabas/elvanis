'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useT, useLang } from '@/app/context/LanguageContext'

type Property = {
  property: string
  displayName: string
  account: string
  accountName: string
}

export default function GASelectPage() {
  const router  = useRouter()
  const t       = useT()
  const lang    = useLang()
  const isAr    = lang === 'ar'
  const [properties, setProperties] = useState<Property[]>([])
  const [selected, setSelected]     = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    fetch('/api/auth/google/properties')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setProperties(data.properties ?? [])
        setLoading(false)
      })
      .catch(() => { setError(t('connect.ga4_err_load')); setLoading(false) })
  }, [])

  async function handleSelect() {
    if (!selected) return
    setSaving(true)
    const res = await fetch('/api/auth/google/select-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: selected }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? t('connect.ga4_err_save')); setSaving(false); return }
    router.push('/signals?connected=ga4')
  }

  const selectedProperty = properties.find(p => p.property === selected)

  return (
    <main dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>{t('connect.back')}</a>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>📊</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{t('connect.ga4_title')}</h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>{t('connect.ga4_sub')}</p>

          {loading && <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t('connect.ga4_loading')}</p>}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {!loading && properties.length === 0 && !error && (
            <p style={{ color: '#6B7280', fontSize: 14 }}>{t('connect.ga4_no_properties')}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {properties.map(p => (
              <button
                key={p.property}
                onClick={() => setSelected(p.property)}
                style={{ padding: '14px 18px', border: `2px solid ${selected === p.property ? '#E37400' : '#E5E7EB'}`, borderRadius: 12, background: selected === p.property ? '#FFF3E0' : '#fff', textAlign: isAr ? 'right' : 'left', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 3px' }}>{p.displayName}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{p.property} · {p.accountName}</p>
              </button>
            ))}
          </div>

          {selectedProperty && (
            <div style={{ background: '#FFF3E0', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                {t('connect.ga4_selected_note')} <strong>{selectedProperty.displayName}</strong>
              </p>
            </div>
          )}

          <button
            onClick={handleSelect}
            disabled={!selected || saving}
            style={{ width: '100%', padding: '14px', background: !selected || saving ? '#E5E7EB' : '#E37400', color: !selected || saving ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !selected || saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? t('connect.ga4_connecting') : t('connect.ga4_cta')}
          </button>
        </div>
      </div>
    </main>
  )
}
