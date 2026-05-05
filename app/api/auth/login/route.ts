import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { key } = await request.json()

  let role: string | null = null
  if (key && key === process.env.ADMIN_KEY)  role = 'admin'
  else if (key && key === process.env.MEMBER_KEY) role = 'member'

  if (!role) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 401 })
  }

  const response = NextResponse.json({ role })
  response.cookies.set('fig_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}
