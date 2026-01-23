import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_ROUTES = ['/login', '/register']
const ADMIN_ROUTES = ['/admin']
const MANAGER_ROUTES = ['/manager']
const CONSULTANT_ROUTES = ['/consultant']
const STAFF_ROUTES = ['/staff']
const WAREHOUSE_ROUTES = ['/warehouse']
const CUSTOMER_ROUTES = ['/customer']

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET!
)

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  // 1. Chưa login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Đã login mà vào login/register
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!token) return NextResponse.next()

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const roleId = payload.role_id as number

    // 3. Admin only
    if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && roleId !== 1) {
      return NextResponse.redirect(new URL('/403', request.url))
    }

    // 4. Manager only
    if (MANAGER_ROUTES.some(r => pathname.startsWith(r)) && roleId !== 3) {
      return NextResponse.redirect(new URL('/403', request.url))
    }

    return NextResponse.next()
  } catch (err) {
    // Token invalid / expired
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
