'use client'

import { useState, useEffect } from 'react'

export default function AssessmentBanner({ hasAssessment }: { hasAssessment: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (hasAssessment) return
    const dismissed = localStorage.getItem('elvanis_assessment_banner_dismissed')
    if (!dismissed) setVisible(true)
  }, [hasAssessment])

  function dismiss() {
    localStorage.setItem('elvanis_assessment_banner_dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12,
      padding: '12px 16px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
      <p style={{ fontSize: 13, color: '#5B21B6', margin: 0, flex: 1 }}>
        Take the business assessment to unlock your full AI readiness score and get personalised recommendations.
      </p>
      <a href="/assessment" style={{ fontSize: 13, color: '#fff', background: '#7C3AED', borderRadius: 8, padding: '6px 14px', textDecoration: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
        Start — 10 min
      </a>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 0 }}
      >
        ✕
      </button>
    </div>
  )
}
