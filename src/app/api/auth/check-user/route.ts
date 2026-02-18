// 이메일이 등록된 유저인지 확인하는 API
// Supabase SQL 함수(check_user_login_status)로 auth.users + user_pins 동시 조회
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email || !email.endsWith('@storytaco.com')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('check_user_login_status', {
    p_email: email,
  })

  if (error) {
    console.error('[check-user] rpc error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  return NextResponse.json(data)
}
