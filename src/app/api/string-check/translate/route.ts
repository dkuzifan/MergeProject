import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// ─── 설정 (모델/제한 변경 시 여기만 수정) ───────────────────────────────
const GEMINI_MODEL = 'gemini-3-pro-preview'  // 모델 변경: gemini-2.5-pro, gemini-2.5-flash 등
const MAX_CHARS_PER_REQUEST = 2000         // 요청당 최대 글자 수 (비용 제한)
// ────────────────────────────────────────────────────────────────────────

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const SYSTEM_PROMPT = `You are a professional game/service localization translator.
Translate UI strings with these priorities:
1. Use terminology common in similar games and services for each target language
2. Keep translations concise — UI elements have limited display space
3. Apply natural abbreviations when the source text is long
4. Use phrasing and style conventions appropriate for each language's gaming/app culture
Return ONLY a valid JSON object with no extra text or markdown.`

export async function POST(request: NextRequest) {
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const targetList = (targets as string[]).join(', ')
  const emptySchema = Object.fromEntries((targets as string[]).map((t) => [t, '']))
  const userPrompt = `Translate this Korean game UI string into: ${targetList}
Korean: "${text}"
Return JSON with these exact keys: ${JSON.stringify(emptySchema)}`

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`Gemini API error [${res.status}]:`, errText)
      const status = res.status === 429 ? 429 : 502
      // TODO: 디버깅 후 detail 제거
      return NextResponse.json(
        { error: 'Translation API failed', detail: `Gemini ${res.status}: ${errText.slice(0, 300)}` },
        { status },
      )
    }

    const data = await res.json()
    const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let translations: Record<string, string>
    try {
      translations = JSON.parse(rawText)
    } catch {
      console.error('Gemini response parse error:', rawText)
      return NextResponse.json({ error: 'Translation API failed' }, { status: 502 })
    }

    return NextResponse.json({ translations })
  } catch {
    return NextResponse.json({ error: 'Translation API failed' }, { status: 502 })
  }
}
