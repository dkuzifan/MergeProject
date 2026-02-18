// 이메일 + PIN 검증 후 세션을 생성하는 API
// PIN이 맞으면 Magic Link 토큰을 서버에서 생성해 클라이언트에 반환합니다
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { email, pin } = await request.json()

  if (!email || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. 이메일로 user_id 조회 (RPC)
  const { data: userId, error: rpcError } = await admin.rpc('get_user_id_by_email', {
    p_email: email,
  })

  if (rpcError || !userId) {
    return NextResponse.json({ error: '등록되지 않은 이메일입니다' }, { status: 404 })
  }

  // 2. PIN 해시 검증
  console.log('[verify-pin] userId from RPC:', userId)
  const pinHash = crypto
    .createHmac('sha256', userId)
    .update(pin)
    .digest('hex')
  console.log('[verify-pin] computed pinHash:', pinHash)

  const { data: pinData } = await admin
    .from('user_pins')
    .select('pin_hash')
    .eq('user_id', userId)
    .single()

  console.log('[verify-pin] stored pinHash:', pinData?.pin_hash)

  if (!pinData || pinData.pin_hash !== pinHash) {
    return NextResponse.json({ error: 'PIN이 올바르지 않습니다' }, { status: 401 })
  }

  // 3. 서버에서 Magic Link 생성 → hashed_token 추출 → 클라이언트에 반환
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    email,
    token: linkData.properties.hashed_token,
  })
}
