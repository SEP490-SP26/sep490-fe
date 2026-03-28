import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeJwt } from 'jose'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/management-login',
  '/about',
  '/products',
  '/look-up',
  '/checkout',
  '/order',
  '/order-detail',
  '/request-detail',
  '/reject-deal',
  '/payment'
]
const MANAGEMENT_ROUTES = [
  '/admin',
  '/manager',
  '/consultant',
  '/staff',
  '/warehouse',
  '/productions-manager',
  '/materials-manager',
  '/inventory',
  '/designer'
]

const ROLE_DASHBOARDS: Record<number, string> = {
  1: '/admin',
  2: '/consultant',
  3: '/manager',
  4: '/warehouse',
  5: '/staff',
  6: '/productions-manager',
  16: '/designer',
  17: '/materials-manager'
}



export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  )

  const isManagementRoute = MANAGEMENT_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  const isStaticFile = pathname.includes('.')

  // 1. Unauthenticated guest (No token)
  if (!token && !isPublicRoute && !isStaticFile) {
    if (isManagementRoute) {
      return NextResponse.redirect(new URL('/management-login', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Public route with no token -> Let through
  if (!token) return NextResponse.next()

  // 3. Authenticated user (Token exists) -> Decode it
  try {
    const payload = decodeJwt(token) as any
    // Check multiple potential keys for roleId (common keys in different JWT types)
    const rolePayload = payload.role_id || payload.roleid || payload.role
    const roleId = Number(rolePayload)

    // Redirect away from login screens if already authenticated
    if (pathname === '/login' || pathname === '/register' || pathname === '/management-login') {
      const dashboard = ROLE_DASHBOARDS[roleId] || '/'
      return NextResponse.redirect(new URL(dashboard, request.url))
    }

    // Role-based access control (Verify correct role for matched management routes)
    if (pathname.startsWith('/admin') && roleId !== 1) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/consultant') && roleId !== 2) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/manager') && roleId !== 3) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/warehouse') && roleId !== 4) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/staff') && roleId !== 5) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/productions-manager') && roleId !== 6) {
      return NextResponse.redirect(new URL('/403', request.url))
    }

    return NextResponse.next()
  } catch (err) {
    // Token is invalid/expired
    // Create a response that redirects and clears the invalid token to avoid loops
    const redirectUrl = new URL(isManagementRoute ? '/management-login' : '/login', request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('token')

    // If already on a public route, just clear cookie but don't redirect (let through)
    if (isPublicRoute || isStaticFile) {
      const nextResponse = NextResponse.next()
      nextResponse.cookies.delete('token')
      return nextResponse
    }

    // Protect non-public routes by redirecting
    return response
  }
}

export default proxy

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
