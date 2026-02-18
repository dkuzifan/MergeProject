// 이메일이 등록된 유저인지 확인하는 API
// 반환: { exists: boolean } — exists=true면 PIN 입력 화면으로, false면 Magic Link 발송
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email || !email.endsWith('@storytaco.com')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // auth.users에서 해당 이메일 유저 조회
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  const user = data.users.find((u) => u.email === email)

  if (!user) {
    return NextResponse.json({ exists: false })
  }

  // user_pins 테이블에 PIN이 저장되어 있는지 확인
  const { data: pinData } = await supabase
    .from('user_pins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ exists: true, hasPin: !!pinData })
}
