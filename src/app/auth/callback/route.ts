// Magic Link 콜백 Route Handler
// 인증 코드를 세션으로 교환한 후:
//   - PIN 미설정 유저 → /login?setup=pin (PIN 최초 설정 화면)
//   - PIN 설정 완료 유저 → / (메인 페이지)
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // PIN 설정 여부 확인
      const admin = createAdminClient()
      const { data: pinData } = await admin
        .from('user_pins')
        .select('user_id')
        .eq('user_id', data.user.id)
        .single()

      if (!pinData) {
        // PIN 미설정 → PIN 설정 화면으로
        return NextResponse.redirect(`${origin}/login?setup=pin`)
      }

      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=expired`)
}
