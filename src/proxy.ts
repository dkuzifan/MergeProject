// 전체 경로 인증 게이트
// 미인증 사용자를 /login으로 리디렉션합니다
// 제외 경로: /auth/callback, _next 정적 파일, favicon.ico
// Next.js 16부터 middleware.ts 대신 proxy.ts를 사용합니다
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 요청 쿠키 갱신
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 응답 쿠키 갱신 (세션 자동 갱신 포함)
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 유저 조회 (만료 직전 토큰 자동 갱신 포함)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 인증됨 + /login 접근 → / 로 리디렉션
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 미인증 + /login 이외 경로 → /login 으로 리디렉션
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // /api/auth/*, /auth/callback, _next 정적 파일, favicon 은 게이트 제외
    '/((?!api/auth|auth/callback|_next/static|_next/image|favicon.ico).*)',
  ],
}
