import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

const ATTENDEE_ROUTES = ['/my-pass']
const ADMIN_ROUTES = ['/admin']
const SCANNER_ROUTES = ['/scan']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('mn_session')?.value

  const redirectLogin = (dest: string) =>
    NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(dest)}`, req.url))

  const redirectAdminLogin = () =>
    NextResponse.redirect(new URL('/admin/login', req.url))

  if (ATTENDEE_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!token) return redirectLogin(pathname)
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if (payload.role !== 'attendee') return redirectLogin(pathname)
    } catch {
      return redirectLogin(pathname)
    }
  }

  if (
    ADMIN_ROUTES.some((r) => pathname.startsWith(r)) &&
    !pathname.startsWith('/admin/login')
  ) {
    if (!token) return redirectAdminLogin()
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if (payload.role !== 'admin') return redirectAdminLogin()
    } catch {
      return redirectAdminLogin()
    }
  }

  if (SCANNER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!token) return redirectAdminLogin()
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if (payload.role !== 'admin' && payload.role !== 'scanner') return redirectAdminLogin()
    } catch {
      return redirectAdminLogin()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/my-pass/:path*', '/admin/:path*', '/scan/:path*'],
}
