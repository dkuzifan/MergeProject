// Supabase Admin 클라이언트 — 서버 사이드 전용
// service_role 키를 사용하므로 클라이언트 컴포넌트에서 절대 import 금지
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
