import Link from 'next/link'

export default function TermsPage() {
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
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', marginBottom: 8, letterSpacing: '-1px' }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 48 }}>Last updated: May 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Elvanis ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. These terms apply to all users including founders on free and paid plans.',
          },
          {
            title: '2. Description of Service',
            body: 'Elvanis is an AI-powered business diagnostic platform that connects to your operational tools, analyses your data, and generates diagnostic signals and recommendations. The Platform is provided on a subscription basis with a free tier and a paid Navigator tier.',
          },
          {
            title: '3. User Accounts',
            body: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information when creating your account. You must notify us immediately of any unauthorised use of your account.',
          },
          {
            title: '4. Data and Privacy',
            body: 'By connecting your tools to Elvanis, you grant us permission to read data from those tools for the purpose of generating diagnostic signals and recommendations. We do not sell your data to third parties. Please refer to our Privacy Policy for full details on how we handle your data.',
          },
          {
            title: '5. Acceptable Use',
            body: 'You agree not to use the Platform for any unlawful purpose, to attempt to gain unauthorised access to any part of the Platform, to interfere with the operation of the Platform, or to use the Platform to transmit harmful or malicious content.',
          },
          {
            title: '6. Subscription and Billing',
            body: 'The free tier is available indefinitely at no cost. The Navigator plan is billed monthly at £29. Subscriptions are renewed manually — you will be notified before your plan expires. We reserve the right to change pricing with 30 days notice.',
          },
          {
            title: '7. Intellectual Property',
            body: 'All content, features, and functionality of the Platform are owned by Elvanis and are protected by applicable intellectual property laws. You retain ownership of your data. We retain ownership of the diagnostic models, algorithms, and platform technology.',
          },
          {
            title: '8. Disclaimer of Warranties',
            body: 'The Platform is provided "as is" without warranties of any kind. We do not guarantee that the Platform will be error-free, uninterrupted, or that the diagnostic signals generated will be accurate or complete. Business decisions made based on Platform output are your sole responsibility.',
          },
          {
            title: '9. Limitation of Liability',
            body: 'To the maximum extent permitted by law, Elvanis shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.',
          },
          {
            title: '10. Termination',
            body: 'We reserve the right to suspend or terminate your account if you violate these terms. You may cancel your account at any time from your profile settings. Upon termination, your data will be retained for 30 days before permanent deletion.',
          },
          {
            title: '11. Changes to Terms',
            body: 'We may update these terms from time to time. We will notify you of significant changes by email. Continued use of the Platform after changes constitutes acceptance of the updated terms.',
          },
          {
            title: '12. Governing Law',
            body: 'These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
          },
          {
            title: '13. Contact',
            body: 'If you have questions about these terms, please contact us through the support section of your profile or via the chat widget on the Platform.',
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
            <Link href="/privacy" style={{ color: '#2563EB', textDecoration: 'none' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
