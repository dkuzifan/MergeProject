// 서버 컴포넌트 / Route Handler에서 사용하는 Supabase 클라이언트
// 클라이언트 컴포넌트에서는 client.ts를 사용하세요
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 서버 컴포넌트에서는 쿠키 쓰기 불가 — Middleware에서 갱신 처리됨
          }
        },
      },
    }
  )
}
