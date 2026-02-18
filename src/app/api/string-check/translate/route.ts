import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const MAX_CHARS_PER_REQUEST = 500

export async function POST(request: NextRequest) {
  // 인증 확인
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, targets } = await request.json()

  if (!text || typeof text !== 'string' || !Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (text.length > MAX_CHARS_PER_REQUEST) {
    return NextResponse.json({ error: 'Text too long', maxChars: MAX_CHARS_PER_REQUEST }, { status: 413 })
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // 언어별 개별 요청을 병렬 처리 (v2는 target 하나만 허용)
  const results = await Promise.allSettled(
    (targets as string[]).map(async (lang) => {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: 'ko', target: lang }),
        }
      )
      if (!res.ok) throw new Error(`Google API ${res.status}`)
      const data = await res.json()
      return { lang, text: data.data.translations[0].translatedText as string }
    })
  )

  const translations: Record<string, string> = {}
  for (const result of results) {
    if (result.status === 'fulfilled') {
      translations[result.value.lang] = result.value.text
    }
  }

  // 일부 성공했으면 200 반환, 전체 실패면 502
  if (Object.keys(translations).length === 0) {
    return NextResponse.json({ error: 'Translation API failed' }, { status: 502 })
  }

  return NextResponse.json({ translations })
}
