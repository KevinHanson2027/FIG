import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Refreshes the Supabase session cookie on every matched request and
 *  sends signed-out visitors from /portal to the login page. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  // Don't put code between createServerClient and getClaims: it refreshes the token.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const { pathname, search } = request.nextUrl

  if (!signedIn && pathname.startsWith('/portal')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }

  if (signedIn && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/portal'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
