import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const SERVICE_LABELS: Record<string, string> = {
  navigator: 'Navigator — Monthly Plan (£29/month)',
  roadmap:   'AI Implementation Roadmap (£99)',
  cpo:       'Fractional CPO Session (£250)',
  training:  'Team AI Workshop (£500)',
  conflict:  'Data Conflict Review (£99)',
}

const ADMIN_ACTION: Record<string, string> = {
  pay_first: 'Founder will complete payment via Stripe. Deliver the service within 24 hours of payment confirmation.',
  calendly:  'Send the founder your Calendly booking link within 24 hours.',
  discovery: 'Reach out within 24 hours to arrange a discovery call before confirming details.',
}

const FOUNDER_NEXT_STEP: Record<string, string> = {
  pay_first: 'You will be redirected to complete payment. Once confirmed, your service will be delivered within 24 hours.',
  calendly:  'Our team will send you a booking link within 24 hours to schedule your session.',
  discovery: 'Our team will reach out within 24 hours to arrange a discovery call and understand your specific needs.',
}

export async function POST(request: NextRequest) {
  try {
    const { type, note, founderName, founderEmail, businessName, flow, founderId } = await request.json()

    if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

    // Guard: navigator should never reach this route — it redirects to Stripe directly
    if (type === 'navigator') {
      console.warn('[advisory] navigator request reached API route — should redirect to Stripe directly')
      return NextResponse.json({ error: 'Navigator upgrades via Stripe directly' }, { status: 400 })
    }

    const adminEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    if (!adminEmail) {
      console.error('[advisory] ADMIN_EMAIL not set')
      return NextResponse.json({ error: 'Service request unavailable — please try again later' }, { status: 500 })
    }

    const serviceLabel    = SERVICE_LABELS[type]    ?? type
    const adminAction     = ADMIN_ACTION[flow]      ?? 'Follow up with the founder within 24 hours.'
    const founderNextStep = FOUNDER_NEXT_STEP[flow] ?? 'Our team will be in touch within 24 hours.'
    const fromEmail       = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

    // ── Save to DB first — email is best-effort ──
    // Request is never lost even if email fails
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

    console.log(`[advisory] saved to DB — type=${type} flow=${flow} founder=${founderId}`)

    // ── Email to admin ──
    const { error: adminEmailErr } = await resend.emails.send({
      from:    fromEmail,
      to:      adminEmail,
      replyTo: founderEmail || undefined,
      subject: `[Elvanis] New service request — ${serviceLabel}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
          <h2 style="color:#2563EB;margin:0 0 6px">New Service Request</h2>
          <p style="color:#6B7280;margin:0 0 24px;font-size:14px">Elvanis — action required within 24 hours</p>

          <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:16px">
            <p style="margin:0 0 8px;font-size:14px"><strong>Service:</strong> ${serviceLabel}</p>
            <p style="margin:0 0 8px;font-size:14px"><strong>Founder:</strong> ${founderName || 'Unknown'}</p>
            <p style="margin:0 0 8px;font-size:14px"><strong>Business:</strong> ${businessName || 'Not provided'}</p>
            <p style="margin:0;font-size:14px"><strong>Email:</strong> ${founderEmail || 'Not provided'}</p>
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
      // Request already saved to DB — do not fail the response
    }

    // ── Confirmation email to founder ──
    if (founderEmail) {
      await resend.emails.send({
        from:    fromEmail,
        to:      founderEmail,
        subject: `Request confirmed — ${serviceLabel}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
            <h1 style="font-size:26px;font-weight:800;color:#2563EB;margin:0 0 4px">Elvanis</h1>
            <p style="color:#6B7280;margin:0 0 32px;font-size:14px">Know what to fix before you scale</p>

            <div style="background:#ECFDF5;border-radius:16px;padding:28px;margin-bottom:24px;text-align:center">
              <div style="font-size:48px;margin-bottom:12px">✅</div>
              <h2 style="color:#065F46;margin:0 0 8px;font-size:20px">Request confirmed</h2>
              <p style="color:#059669;margin:0;font-size:14px">Our team will be in touch within 24 hours</p>
            </div>

            <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:16px">
              <p style="margin:0 0 4px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Service requested</p>
              <p style="margin:0;font-weight:700;color:#111827;font-size:15px">${serviceLabel}</p>
            </div>

            <div style="background:#EFF6FF;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="font-weight:700;color:#2563EB;margin:0 0 6px;font-size:13px">WHAT HAPPENS NEXT:</p>
              <p style="color:#1D4ED8;margin:0;font-size:14px;line-height:1.6">${founderNextStep}</p>
            </div>

            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/"
              style="display:inline-block;padding:12px 28px;background:#2563EB;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
              Back to dashboard →
            </a>

            <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">Elvanis · Know what to fix before you scale</p>
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