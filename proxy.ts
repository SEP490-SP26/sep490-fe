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
  '/inventory',
  '/general-manager'
]

const ROLE_DASHBOARDS: Record<number, string> = {
  1: '/admin',
  2: '/consultant',
  3: '/manager',
  4: '/warehouse',
  5: '/customer',
  6: '/productions-manager',
  7: '/staff',
  18: '/general-manager'
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  /* =========================
     🔥 FIX QUAN TRỌNG NHẤT
     Không cho middleware xử lý login pages
     ========================= */
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/management-login') ||
    pathname.startsWith('/register')
  ) {
    return NextResponse.next()
  }

  const isStaticFile =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  )

  const isManagementRoute = MANAGEMENT_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  const isManagementContext = isManagementRoute

  /* =========================
     1. NO TOKEN
     ========================= */
  if (!token) {
    if (isStaticFile || isPublicRoute) {
      return NextResponse.next()
    }

    return NextResponse.redirect(
      new URL(
        isManagementContext ? '/management-login' : '/login',
        request.url
      )
    )
  }

  /* =========================
     2. HAS TOKEN
     ========================= */
  try {
    const payload = decodeJwt(token) as any
    const rolePayload = payload.role_id || payload.roleid || payload.role
    const roleId = Number(rolePayload)

    /* =========================
       Đã login → không cho vào login page
       ========================= */
    if (
      pathname === '/login' ||
      pathname === '/management-login' ||
      pathname === '/register'
    ) {
      const dashboard = ROLE_DASHBOARDS[roleId]
      if (!dashboard) return NextResponse.next()

      return NextResponse.redirect(new URL(dashboard, request.url))
    }

    /* =========================
       RBAC
       ========================= */
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
    if (pathname.startsWith('/staff') && roleId !== 7) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/productions-manager') && roleId !== 6) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
    if (pathname.startsWith('/general-manager') && roleId !== 18) {
      return NextResponse.redirect(new URL('/403', request.url))
    }


    return NextResponse.next()
  } catch (err) {
    /* =========================
       TOKEN LỖI / EXPIRED
       ========================= */
    const isManagementContext = MANAGEMENT_ROUTES.some(route =>
      pathname.startsWith(route)
    )

    const response = NextResponse.redirect(
      new URL(
        isManagementContext ? '/management-login' : '/login',
        request.url
      )
    )

    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
}