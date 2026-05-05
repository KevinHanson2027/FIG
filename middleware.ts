import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const role = request.cookies.get('fig_role')?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/hub') && role !== 'admin' && role !== 'member') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/hub/:path*'],
}
