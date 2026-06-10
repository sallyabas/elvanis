'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'

const TEMPLATES = [
  {
    id: 'support',
    name: 'Customer Support Export',
    description: 'Ticket volume, resolution time, complaint categories',
    icon: '🎫',
    color: '#D97706',
    bg: '#FFFBEB',
    tools: ['Gorgias', 'Zendesk', 'Intercom', 'Freshdesk'],
    columns: ['ticket_id', 'date', 'subject', 'category', 'status', 'resolution_hours', 'customer_id'],
    example: [
      ['ticket_id', 'date', 'subject', 'category', 'status', 'resolution_hours', 'customer_id'],
      ['TK-001', '2026-04-01', 'Order not received', 'delivery', 'resolved', '48', 'CUST-123'],
      ['TK-002', '2026-04-02', 'Wrong item sent', 'fulfilment', 'open', '', 'CUST-456'],
      ['TK-003', '2026-04-02', 'Refund not processed', 'refund', 'resolved', '72', 'CUST-789'],
    ],
    signals: ['ticket_volume_increase', 'response_time_increase', 'repeat_complaint_pattern'],
  },
  {
    id: 'orders',
    name: 'Orders & Revenue Export',
    description: 'Order value, refund rate, repeat purchase behaviour',
    icon: '💰',
    color: '#2563EB',
    bg: '#EFF6FF',
    tools: ['Shopify', 'WooCommerce', 'Stripe', 'Square'],
    columns: ['order_id', 'date', 'customer_id', 'value', 'status', 'refunded', 'is_repeat_customer'],
    example: [
      ['order_id', 'date', 'customer_id', 'value', 'status', 'refunded', 'is_repeat_customer'],
      ['ORD-001', '2026-04-01', 'CUST-123', '85.00', 'completed', 'false', 'true'],
      ['ORD-002', '2026-04-02', 'CUST-456', '120.00', 'refunded', 'true', 'false'],
      ['ORD-003', '2026-04-03', 'CUST-789', '45.00', 'completed', 'false', 'false'],
    ],
    signals: ['refund_spike', 'aov_decline', 'repeat_purchase_drop', 'churn_spike'],
  },
  {
    id: 'satisfaction',
    name: 'Customer Satisfaction (NPS / CSAT)',
    description: 'NPS scores, CSAT ratings, survey responses',
    icon: '⭐',
    color: '#059669',
    bg: '#ECFDF5',
    tools: ['Delighted', 'Typeform', 'Intercom', 'HubSpot'],
    columns: ['date', 'score', 'type', 'segment', 'comment'],
    example: [
      ['date', 'score', 'type', 'segment', 'comment'],
      ['2024-01-15', '72', 'NPS', 'enterprise', 'Great product but onboarding is slow'],
      ['2024-01-16', '4', 'CSAT', 'smb', 'Support response was too slow'],
      ['2024-01-17', '85', 'NPS', 'startup', 'Love the platform easy to use'],
    ],
    signals: ['nps_decline', 'csat_decline', 'repeat_complaint_pattern'],
  },
  {
    id: 'velocity',
    name: 'Team Velocity Export',
    description: 'Sprint completion, bug backlog, delivery reliability',
    icon: '⚙️',
    color: '#0891B2',
    bg: '#ECFEFF',
    tools: ['Jira', 'Linear', 'Asana', 'Shortcut'],
    columns: ['sprint_name', 'start_date', 'end_date', 'planned_points', 'delivered_points', 'bugs_opened', 'bugs_closed'],
    example: [
      ['sprint_name', 'start_date', 'end_date', 'planned_points', 'delivered_points', 'bugs_opened', 'bugs_closed'],
      ['Sprint 24', '2026-03-17', '2026-03-28', '42', '31', '8', '5'],
      ['Sprint 25', '2026-03-31', '2026-04-11', '38', '22', '12', '4'],
      ['Sprint 26', '2026-04-14', '2026-04-25', '40', '28', '6', '9'],
    ],
    signals: ['velocity_drop', 'bug_backlog_growth'],
  },
  {
    id: 'financial',
    name: 'Financial Snapshot',
    description: 'MRR, growth rate, churn rate, AOV — manual entry',
    icon: '💵',
    color: '#059669',
    bg: '#ECFDF5',
    tools: ['Manual entry', 'Stripe', 'Xero', 'QuickBooks'],
    columns: ['month', 'mrr', 'growth_rate_pct', 'churn_rate_pct', 'aov', 'refund_rate_pct'],
    example: [
      ['month', 'mrr', 'growth_rate_pct', 'churn_rate_pct', 'aov', 'refund_rate_pct'],
      ['2026-03', '12500', '8.5', '3.2', '85.00', '2.1'],
      ['2026-04', '13200', '5.6', '4.1', '82.00', '3.4'],
      ['2026-05', '13800', '4.5', '5.2', '79.00', '4.8'],
    ],
    signals: ['churn_spike', 'aov_decline', 'refund_spike', 'conversion_fall'],
  },
  {
    id: 'marketing',
    name: 'Marketing Metrics',
    description: 'CAC, CPL, email open rates, campaign performance',
    icon: '📣',
    color: '#D97706',
    bg: '#FFFBEB',
    tools: ['Klaviyo', 'Mailchimp', 'HubSpot', 'Meta Ads'],
    columns: ['month', 'cac', 'cpl', 'email_open_rate_pct', 'email_ctr_pct', 'ad_spend', 'revenue_from_ads'],
    example: [
      ['month', 'cac', 'cpl', 'email_open_rate_pct', 'email_ctr_pct', 'ad_spend', 'revenue_from_ads'],
      ['2026-03', '45.00', '12.00', '28.5', '3.2', '5000', '18000'],
      ['2026-04', '52.00', '15.00', '24.1', '2.8', '5500', '17000'],
      ['2026-05', '61.00', '18.00', '21.3', '2.1', '6000', '16000'],
    ],
    signals: ['conversion_fall', 'engagement_drop', 'traffic_source_shift'],
  },
]

function downloadTemplate(template: typeof TEMPLATES[0]) {
  const csv = template.example.map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `elvanis_${template.id}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function CSVUploadContent() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string[][]>([])
  const [uploadedTemplates, setUploadedTemplates] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/csv/uploaded-templates')
      .then(r => r.json())
      .then(data => setUploadedTemplates(data.templates ?? []))
      .catch(() => {})
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = text.split('\n').slice(0, 4).map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
      setPreview(rows)
    }
    reader.readAsText(f)
  }

  async function handleUpload() {
    if (!file || !selectedTemplate) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('templateType', selectedTemplate)
    const res = await fetch('/api/csv/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Upload failed')
      setUploading(false)
      return
    }
    router.push(`/signals?connected=csv&signals=${data.signals}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 40 }}>
        <a href="/connect" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          ← Back to connections
        </a>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Upload CSV data</h1>
        <p style={{ color: '#6B7280', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          Export data from any tool and upload it here. Elvanis will analyse it and generate diagnostic signals automatically.
          Download a template to see the exact format needed.
        </p>

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            Step 1 — What type of data are you uploading?
          </h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
            Download the template, fill it with your data, then upload below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TEMPLATES.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                style={{
                  background: '#fff', borderRadius: 14,
                  border: `2px solid ${selectedTemplate === t.id ? t.color : '#E5E7EB'}`,
                  padding: '16px 20px', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {t.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>{t.name}</p>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 6px' }}>{t.description}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.tools.map(tool => (
                          <span key={tool} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 6, background: '#F3F4F6', color: '#6B7280', fontWeight: 500 }}>
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadTemplate(t) }}
                    style={{ padding: '8px 16px', background: t.bg, color: t.color, border: `1px solid ${t.color}40`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    ↓ Template
                  </button>
                </div>
                {selectedTemplate === t.id && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10, overflowX: 'auto' }}>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Required columns
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      {t.columns.map(col => (
                        <code key={col} style={{ fontSize: 12, padding: '2px 8px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, color: '#374151' }}>
                          {col}
                        </code>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Signals this generates
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.signals.map(s => (
                        <span key={s} style={{ fontSize: 11, padding: '2px 8px', background: '#EFF6FF', color: '#2563EB', borderRadius: 6, fontWeight: 500 }}>
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedTemplate && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
              Step 2 — Upload your CSV file
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
              Make sure your file has the column headers exactly as shown in the template.
            </p>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: 13, color: '#1D4ED8', margin: 0, lineHeight: 1.5 }}>
                Keep all columns exactly as they are in the template. If you don't have data for a specific row or column, just leave it blank — don't delete the column.
              </p>
            </div>
            {uploadedTemplates.includes(selectedTemplate) && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>⚠️</span>
                <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                  You have previously uploaded data for this template. Re-uploading will update existing signals with the new data.
                </p>
              </div>
            )}
            <label style={{ display: 'block', padding: '32px', background: '#fff', border: '2px dashed #E5E7EB', borderRadius: 14, textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
              <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
              {file ? (
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>📄 {file.name}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📁</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Click to upload CSV</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Or drag and drop · Max 5MB</p>
                </div>
              )}
            </label>

            {preview.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px', marginBottom: 16, overflowX: 'auto' }}>
                <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Preview — first {preview.length} rows
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ padding: '6px 10px', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#374151' : '#6B7280', background: i === 0 ? '#F9FAFB' : '#fff', fontFamily: i === 0 ? 'monospace' : 'inherit', whiteSpace: 'nowrap' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{ width: '100%', padding: '14px', background: !file || uploading ? '#E5E7EB' : '#2563EB', color: !file || uploading ? '#9CA3AF' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !file || uploading ? 'not-allowed' : 'pointer' }}
            >
              {uploading ? 'Analysing your data...' : 'Upload and generate signals →'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function CSVUploadPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#6B7280' }}>Loading...</div>}>
      <CSVUploadContent />
    </Suspense>
  )
}
