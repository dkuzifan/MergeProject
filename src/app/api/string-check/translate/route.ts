import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// ─── 설정 (모델/제한 변경 시 여기만 수정) ───────────────────────────────
const PRIMARY_MODEL = 'gemini-3-pro-preview'  // 1순위 모델
const FALLBACK_MODEL = 'gemini-2.5-pro'       // 503 시 폴백 모델
const MAX_CHARS_PER_REQUEST = 2000            // 요청당 최대 글자 수 (비용 제한)
// ────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional game/service localization translator.
Translate UI strings with these priorities:
1. Use terminology common in similar games and services for each target language
2. Keep translations concise — UI elements have limited display space
3. Apply natural abbreviations when the source text is long
4. Use phrasing and style conventions appropriate for each language's gaming/app culture
Return ONLY a valid JSON object with no extra text or markdown.`

async function callGemini(model: string, body: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  return res
}

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

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  })

  const models = [PRIMARY_MODEL, FALLBACK_MODEL]

  for (const model of models) {
    try {
      const res = await callGemini(model, body, apiKey)

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error(`Gemini [${model}] error [${res.status}]:`, errText)

        // 503 과부하 → 다음 모델로 폴백, 그 외 → 즉시 반환
        if (res.status === 503 && model !== FALLBACK_MODEL) {
          console.log(`Falling back to ${FALLBACK_MODEL}`)
          continue
        }

        const status = res.status === 429 ? 429 : 502
        return NextResponse.json({ error: 'Translation API failed' }, { status })
      }

      const data = await res.json()
      const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      let translations: Record<string, string>
      try {
        translations = JSON.parse(rawText)
      } catch {
        console.error(`Gemini [${model}] parse error:`, rawText)
        return NextResponse.json({ error: 'Translation API failed' }, { status: 502 })
      }

      if (model !== PRIMARY_MODEL) {
        console.log(`Translation succeeded via fallback model: ${model}`)
      }
      return NextResponse.json({ translations })
    } catch (err) {
      console.error(`Gemini [${model}] fetch error:`, err)
      if (model !== FALLBACK_MODEL) continue
    }
  }

  return NextResponse.json({ error: 'Translation API failed' }, { status: 502 })
}
