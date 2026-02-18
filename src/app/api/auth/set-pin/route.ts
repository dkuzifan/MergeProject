// Magic Link 로그인 완료 후 PIN을 저장하는 API (인증 상태에서만 호출 가능)
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { pin } = await request.json()

  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: '4자리 숫자를 입력해주세요' }, { status: 400 })
  }

  // 현재 로그인된 유저 확인
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // PIN을 user_id 기반으로 해싱
  console.log('[set-pin] user.id:', user.id)
  const pinHash = crypto
    .createHmac('sha256', user.id)
    .update(pin)
    .digest('hex')
  console.log('[set-pin] pinHash:', pinHash)

  // user_pins 테이블에 저장 (이미 있으면 업데이트)
  const admin = createAdminClient()
  const { error } = await admin
    .from('user_pins')
    .upsert({ user_id: user.id, pin_hash: pinHash, updated_at: new Date().toISOString() })

  if (error) {
    return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
