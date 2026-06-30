import { NextRequest, NextResponse } from 'next/server'

function checkAdminAuth(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { founderId, sourceType, force = true, sendEmail = false } = await request.json()
  if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

  const { runScan } = await import('@/lib/run-scan')
  const result = await runScan({
    founderId,
    sourceType,
    force,
    sendEmail,
    triggeredBy: 'admin',
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }

  return NextResponse.json({ success: true, results: result.results, masterScanId: result.masterScanId })
}