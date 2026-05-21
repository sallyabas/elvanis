import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 900, color: '#2563EB', textDecoration: 'none', letterSpacing: '-0.5px' }}>Elvanis</Link>
          <Link href="/signup" style={{ fontSize: 14, color: '#6B7280', textDecoration: 'none' }}>← Back to signup</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 32px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-1px' }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 48 }}>Last updated: May 2026</p>

        {[
          {
            title: '1. Who We Are',
            body: 'Elvanis is an AI-powered business diagnostic platform. We are committed to protecting your personal data and being transparent about how we use it. This Privacy Policy explains what data we collect, why we collect it, and how we use it.',
          },
          {
            title: '2. Data We Collect',
            body: 'We collect information you provide directly: your name, email address, business name, and account credentials. We collect business data from tools you connect to the Platform (Shopify, Jira, GA4, Intercom, Trustpilot) for the purpose of generating diagnostic signals. We collect usage data such as pages visited and features used to improve the Platform.',
          },
          {
            title: '3. How We Use Your Data',
            body: 'We use your data to provide and improve the Platform, generate diagnostic signals and recommendations, send service communications such as scan results and account notifications, and respond to support requests. We do not use your data for advertising purposes.',
          },
          {
            title: '4. Third-Party Tool Data',
            body: 'When you connect a third-party tool (Shopify, Jira, GA4, Intercom, Trustpilot), we request read-only access to specific data from that tool. We only request the minimum permissions necessary to generate diagnostic signals. We do not modify or write data to your connected tools.',
          },
          {
            title: '5. Data Storage and Security',
            body: 'Your data is stored securely on Supabase infrastructure hosted in the EU. We use industry-standard encryption for data in transit and at rest. Access tokens for connected tools are encrypted before storage. We do not store your third-party passwords.',
          },
          {
            title: '6. Data Sharing',
            body: 'We do not sell your personal data or business data to third parties. We share data with service providers who help us operate the Platform (Supabase for database, Groq for AI analysis, Vercel for hosting, Resend for email). These providers are bound by data processing agreements.',
          },
          {
            title: '7. AI Processing',
            body: 'Your business data is processed by AI models (Groq/Llama) to generate diagnostic signals. This processing is done on a per-request basis and your data is not used to train AI models. Diagnostic signals are stored in your account and are only visible to you.',
          },
          {
            title: '8. Data Retention',
            body: 'We retain your account data for as long as your account is active. If you deactivate your account, your data is retained for 30 days before permanent deletion. You may request immediate deletion by contacting us. Connected tool access tokens are deleted immediately upon disconnection.',
          },
          {
            title: '9. Your Rights (GDPR)',
            body: 'If you are located in the UK or EU, you have the right to access your personal data, correct inaccurate data, request deletion of your data, restrict processing of your data, and data portability. To exercise these rights, contact us through the support section of your profile.',
          },
          {
            title: '10. Cookies',
            body: 'We use essential cookies for authentication and session management. We use analytics cookies to understand how the Platform is used. You can control cookie preferences through your browser settings. Disabling essential cookies will prevent you from logging in.',
          },
          {
            title: '11. International Transfers',
            body: 'Your data may be processed in countries outside the UK and EU by our service providers. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.',
          },
          {
            title: '12. Children\'s Privacy',
            body: 'The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us immediately.',
          },
          {
            title: '13. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by email. The date at the top of this page indicates when the policy was last updated.',
          },
          {
            title: '14. Contact Us',
            body: 'If you have questions about this Privacy Policy or how we handle your data, please contact us through the support section of your profile or via the chat widget on the Platform.',
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.8, margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 32, marginTop: 16 }}>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>
            © 2026 Elvanis. All rights reserved. ·{' '}
            <Link href="/terms" style={{ color: '#2563EB', textDecoration: 'none' }}>Terms of Service</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
