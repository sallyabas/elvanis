import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { founderId, ticketType, subject, message } = await request.json()

    if (!founderId || !ticketType || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch founder for personalisation
    const { data: founder } = await admin
      .from('founders')
      .select('full_name, email, business_name, subscription_tier')
      .eq('id', founderId)
      .maybeSingle()

    if (!founder) {
      return NextResponse.json({ error: 'Founder not found' }, { status: 404 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (!adminEmail) {
      console.error('[support] ADMIN_EMAIL not set')
      return NextResponse.json({ error: 'Support unavailable — please try again later' }, { status: 500 })
    }

    const founderName = founder.full_name?.split(' ')[0] ?? 'Founder'
    const tier        = founder.subscription_tier === 'navigator' ? 'Navigator' : 'Free'

    // ── Save ticket to DB first — email is best-effort ──
    // Ticket is never lost even if email fails
    const { error: ticketErr } = await admin
      .from('support_tickets')
      .insert({
        founder_id:  founderId,
        ticket_type: ticketType,
        subject:     subject.trim(),
        message:     message.trim(),
        status:      'open',
      })

    if (ticketErr) {
      console.error('[support] DB insert failed:', ticketErr.message)
      return NextResponse.json({ error: 'Failed to save ticket — please try again' }, { status: 500 })
    }

    console.log('[support] ticket saved to DB — founder:', founderId, 'type:', ticketType)

    // Send to admin
    const { error: adminEmailErr } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to:      adminEmail,
      subject: `[Elvanis Support] [${ticketType}] ${subject}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
          <h1 style="font-size:22px;font-weight:800;color:#2563EB;margin:0 0 4px">Elvanis Support Ticket</h1>
          <p style="color:#6B7280;font-size:13px;margin:0 0 28px">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>

          <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:20px">
            <p style="margin:0 0 8px;font-size:13px;color:#6B7280"><strong style="color:#111827">From:</strong> ${founder.full_name ?? 'Unknown'} (${founder.email ?? 'No email'})</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6B7280"><strong style="color:#111827">Business:</strong> ${founder.business_name ?? 'Not set'}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6B7280"><strong style="color:#111827">Plan:</strong> ${tier}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#6B7280"><strong style="color:#111827">Ticket type:</strong> ${ticketType}</p>
            <p style="margin:0;font-size:13px;color:#6B7280"><strong style="color:#111827">Subject:</strong> ${subject}</p>
          </div>

          <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 10px">Message:</p>
            <p style="font-size:14px;color:#111827;line-height:1.7;margin:0;white-space:pre-wrap">${message}</p>
          </div>

          <p style="color:#9CA3AF;font-size:12px;margin:0">Reply to: ${founder.email ?? 'no-reply'}</p>
        </div>
      `,
      replyTo: founder.email ?? undefined,
    })

    if (adminEmailErr) {
      console.error('[support] admin email failed:', adminEmailErr)
      // In local/test mode Resend only sends to verified addresses
      // Log the ticket details so no data is lost even if email fails
      console.log('[support] ticket details (email failed):', {
        founder: founder.full_name, email: founder.email,
        ticketType, subject, message,
      })
      // Do not return 500 — ticket was received, email delivery is best-effort
      // Founder sees success, admin checks logs until domain is verified
    }

    // Send confirmation to founder
    if (founder.email) {
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to:      founder.email,
        subject: `We received your message — ${subject}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">
            <h1 style="font-size:22px;font-weight:800;color:#2563EB;margin:0 0 24px">Elvanis</h1>
            <h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 12px">We got your message, ${founderName}</h2>
            <p style="font-size:14px;color:#6B7280;line-height:1.7;margin:0 0 20px">
              Thanks for reaching out. We have received your <strong>${ticketType}</strong> request and will get back to you within 1 business day.
            </p>
            <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin-bottom:24px">
              <p style="font-size:13px;color:#374151;font-weight:600;margin:0 0 4px">Your message:</p>
              <p style="font-size:13px;color:#6B7280;font-style:italic;margin:0">${subject}</p>
            </div>
            <p style="color:#9CA3AF;font-size:12px;margin:0">Elvanis · Know what to fix before you scale</p>
          </div>
        `,
      }).catch(err => console.error('[support] confirmation email failed:', err))
    }

    console.log(`[support] ticket sent — founder=${founderId} type=${ticketType}`)
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[support] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}