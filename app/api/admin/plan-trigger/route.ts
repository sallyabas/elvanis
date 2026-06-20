import { NextRequest, NextResponse } from 'next/server'

function checkAdminAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { founderId } = await request.json()
  if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  try {
    const res = await fetch(`${appUrl}/api/digest/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId }),
    })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'Digest generation failed' }, { status: res.status })
    }

    return NextResponse.json({ success: true, digestId: data.digestId, note: 'Plan generated and email sent automatically.' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}