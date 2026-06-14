import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { getT } from '@/lib/translations'
import type { Lang } from '@/lib/translations'

const resend = new Resend(process.env.RESEND_API_KEY)

const SERVICE_TYPE_TITLE_KEY: Record<string, 'advisory.svc_navigator_title' | 'advisory.svc_roadmap_title' | 'advisory.svc_cpo_title' | 'advisory.svc_training_title' | 'advisory.svc_conflict_title'> = {
  navigator: 'advisory.svc_navigator_title',
  roadmap:   'advisory.svc_roadmap_title',
  cpo:       'advisory.svc_cpo_title',
  training:  'advisory.svc_training_title',
  conflict:  'advisory.svc_conflict_title',
}

const SERVICE_TYPE_PRICE_KEY: Record<string, 'advisory.svc_navigator_price' | 'advisory.svc_roadmap_price' | 'advisory.svc_cpo_price' | 'advisory.svc_training_price' | 'advisory.svc_conflict_price'> = {
  navigator: 'advisory.svc_navigator_price',
  roadmap:   'advisory.svc_roadmap_price',
  cpo:       'advisory.svc_cpo_price',
  training:  'advisory.svc_training_price',
  conflict:  'advisory.svc_conflict_price',
}

const FLOW_NEXT_KEY: Record<string, 'advisory.email_next_pay' | 'advisory.email_next_calendly' | 'advisory.email_next_discovery'> = {
  pay_first: 'advisory.email_next_pay',
  calendly:  'advisory.email_next_calendly',
  discovery: 'advisory.email_next_discovery',
}

const FLOW_NEXT_LABEL_KEY: Record<string, 'advisory.next_payment' | 'advisory.next_booking' | 'advisory.next_discovery'> = {
  pay_first: 'advisory.next_payment',
  calendly:  'advisory.next_booking',
  discovery: 'advisory.next_discovery',
}

const ADMIN_ACTION: Record<string, string> = {
  pay_first: 'Founder will complete payment via Stripe. Deliver the service within 24 hours of payment confirmation.',
  calendly:  'Send the founder your Calendly booking link within 24 hours.',
  discovery: 'Reach out within 24 hours to arrange a discovery call before confirming details.',
}

export async function POST(request: NextRequest) {
  try {
    const { type, note, founderName, founderEmail, businessName, flow, founderId, language } = await request.json()

    if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

    if (type === 'navigator') {
      console.warn('[advisory] navigator request reached API route — should redirect to Stripe directly')
      return NextResponse.json({ error: 'Navigator upgrades via Stripe directly' }, { status: 400 })
    }

    const adminEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    if (!adminEmail) {
      console.error('[advisory] ADMIN_EMAIL not set')
      return NextResponse.json({ error: 'Service request unavailable — please try again later' }, { status: 500 })
    }

    const lang: Lang = language === 'ar' ? 'ar' : 'en'
    const isAr       = lang === 'ar'
    const tEn        = getT('en')
    const tLang      = getT(lang)

    // Service label — always EN for admin, founder's language for founder email
    const titleKey    = SERVICE_TYPE_TITLE_KEY[type]
    const priceKey    = SERVICE_TYPE_PRICE_KEY[type]
    const serviceLabelEn    = titleKey ? `${tEn(titleKey)} (${tEn(priceKey)})` : type
    const serviceLabelFounder = titleKey ? `${tLang(titleKey)} (${tLang(priceKey)})` : type

    const adminAction     = ADMIN_ACTION[flow] ?? 'Follow up with the founder within 24 hours.'
    const founderNextStep = FLOW_NEXT_KEY[flow] ? tLang(FLOW_NEXT_KEY[flow]) : tLang('advisory.success_sub')
    const nextLabel       = FLOW_NEXT_LABEL_KEY[flow] ? tLang(FLOW_NEXT_LABEL_KEY[flow]) : ''
    const fromEmail       = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    // ── Save to DB first ──
    const admin = createAdminClient()
    const { error: dbErr } = await admin
      .from('service_requests')
      .insert({
        founder_id:    founderId ?? null,
        type,
        flow,
        note:          note?.trim() || null,
        founder_name:  founderName  || null,
        founder_email: founderEmail || null,
        business_name: businessName || null,
        status:        'pending',
      })

    if (dbErr) {
      console.error('[advisory] DB insert failed:', dbErr.message)
      return NextResponse.json({ error: 'Failed to save request — please try again' }, { status: 500 })
    }

    console.log(`[advisory] saved to DB — type=${type} flow=${flow} founder=${founderId} lang=${lang}`)

    // ── Email to admin (always English) ──
    const { error: adminEmailErr } = await resend.emails.send({
      from:    fromEmail,
      to:      adminEmail,
      replyTo: founderEmail || undefined,
      subject: `[Elvanis] New service request — ${serviceLabelEn}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
          <h2 style="color:#2563EB;margin:0 0 6px">New Service Request</h2>
          <p style="color:#6B7280;margin:0 0 24px;font-size:14px">Elvanis — action required within 24 hours</p>
          <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:16px">
            <p style="margin:0 0 8px;font-size:14px"><strong>Service:</strong> ${serviceLabelEn}</p>
            <p style="margin:0 0 8px;font-size:14px"><strong>Founder:</strong> ${founderName || 'Unknown'}</p>
            <p style="margin:0 0 8px;font-size:14px"><strong>Business:</strong> ${businessName || 'Not provided'}</p>
            <p style="margin:0 0 8px;font-size:14px"><strong>Email:</strong> ${founderEmail || 'Not provided'}</p>
            <p style="margin:0;font-size:14px"><strong>Language:</strong> ${lang.toUpperCase()}</p>
          </div>
          <div style="background:#EFF6FF;border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="font-weight:700;color:#2563EB;margin:0 0 6px;font-size:13px">YOUR ACTION:</p>
            <p style="color:#1D4ED8;margin:0;font-size:14px;line-height:1.6">${adminAction}</p>
          </div>
          ${note ? `
          <div style="background:#F5F3FF;border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="font-weight:700;color:#7C3AED;margin:0 0 6px;font-size:13px">NOTE FROM FOUNDER:</p>
            <p style="color:#374151;margin:0;font-size:14px;line-height:1.6">${note}</p>
          </div>` : ''}
          <p style="color:#9CA3AF;font-size:12px;margin:0">Reply to: ${founderEmail || 'no email provided'}</p>
        </div>
      `,
    })

    if (adminEmailErr) {
      console.error('[advisory] admin email failed:', adminEmailErr)
    }

    // ── Confirmation email to founder (bilingual, RTL-aware) ──
    if (founderEmail) {
      await resend.emails.send({
        from:    fromEmail,
        to:      founderEmail,
        subject: `${tLang('advisory.success_title')} — ${serviceLabelFounder}`,
        html: `
          <div dir="${isAr ? 'rtl' : 'ltr'}" style="font-family:${isAr ? 'Arial' : 'Inter,Arial'},sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;direction:${isAr ? 'rtl' : 'ltr'};text-align:${isAr ? 'right' : 'left'}">
            <h1 style="font-size:26px;font-weight:800;color:#2563EB;margin:0 0 4px">Elvanis</h1>
            <p style="color:#6B7280;margin:0 0 32px;font-size:14px">${tLang('advisory.email_tagline')}</p>
            <div style="background:#ECFDF5;border-radius:16px;padding:28px;margin-bottom:24px;text-align:center">
              <div style="font-size:48px;margin-bottom:12px">✅</div>
              <h2 style="color:#065F46;margin:0 0 8px;font-size:20px">${tLang('advisory.success_title')}</h2>
              <p style="color:#059669;margin:0;font-size:14px">${tLang('advisory.email_confirmed_sub')}</p>
            </div>
            <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:16px">
              <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">${tLang('advisory.service_requested')}</p>
              <p style="margin:0;font-weight:700;color:#111827;font-size:15px">${serviceLabelFounder}</p>
            </div>
            <div style="background:#EFF6FF;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="font-weight:700;color:#2563EB;margin:0 0 6px;font-size:13px">${tLang('advisory.email_next_steps')}</p>
              <p style="color:#1D4ED8;margin:0;font-size:14px;line-height:1.6">${founderNextStep}</p>
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/"
              style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
              ${tLang('advisory.back_dashboard')}
            </a>
            <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">${tLang('advisory.email_tagline')}</p>
          </div>
        `,
      }).catch(err => console.error('[advisory] founder email failed:', err))
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[advisory] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
