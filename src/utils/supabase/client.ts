// 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트
// 서버 컴포넌트 / Route Handler에서는 server.ts를 사용하세요
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
