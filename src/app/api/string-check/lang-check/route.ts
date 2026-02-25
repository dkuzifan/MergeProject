import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// ─── 설정 ────────────────────────────────────────────────────────────────────
const PRIMARY_MODEL = 'gemini-3-pro-preview'
const FALLBACK_MODEL = 'gemini-2.5-pro'
// ────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a language verification specialist for game UI localization.
Your task: identify cells where the text is CLEARLY written in the wrong language.

Rules:
- ONLY flag text that is OBVIOUSLY in the wrong language (e.g., Japanese text in an English column)
- Do NOT flag: brand names, proper nouns, game-specific terms, international jargon
- Do NOT flag: words borrowed across multiple languages (e.g., "OK", "menu", "level", "boss", "item", "DLC")
- Do NOT flag: pure numbers, symbols, or punctuation
- Do NOT flag: words with 3 or fewer characters (likely loanwords or abbreviations)
- When in doubt, do NOT flag — false negatives are acceptable, false positives are not
- "detected" field must use Korean language names only: 한국어, 영어, 프랑스어, 일본어, 스페인어, 독일어, 인도네시아어, 베트남어, 중국어, 러시아어
Return ONLY a valid JSON object with no extra text or markdown.
Format: {"issues": [{"rowIndex": "...", "colIdx": N, "detected": "..."}]}
If no issues found, return {"issues": []}`

interface CellInput {
  colIdx: number
  text: string
  lang: string
  langName: string
}

interface RowInput {
  index: string
  cells: CellInput[]
}

async function callGemini(model: string, geminiBody: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: geminiBody,
  })
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { rows } = await request.json() as { rows: RowInput[] }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ issues: [] })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const userPrompt = `Check each cell below for language errors. Each entry shows the expected language (langName) and the actual text. Flag cells where the text is CLEARLY in the wrong language.

Data:
${JSON.stringify(rows)}`

  const geminiBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  })

  const models = [PRIMARY_MODEL, FALLBACK_MODEL]

  for (const model of models) {
    try {
      const res = await callGemini(model, geminiBody, apiKey)

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error(`Gemini [${model}] lang-check error [${res.status}]:`, errText)

        // 503 과부하 → 다음 모델로 폴백, 그 외 → 즉시 반환
        if (res.status === 503 && model !== FALLBACK_MODEL) {
          console.log(`Falling back to ${FALLBACK_MODEL}`)
          continue
        }

        return NextResponse.json({ error: 'Language check API failed' }, { status: 502 })
      }

      const data = await res.json()
      const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      let result: { issues: Array<{ rowIndex: string; colIdx: number; detected: string }> }
      try {
        result = JSON.parse(rawText)
      } catch {
        console.error(`Gemini [${model}] lang-check parse error:`, rawText)
        return NextResponse.json({ error: 'Language check API failed' }, { status: 502 })
      }

      if (model !== PRIMARY_MODEL) {
        console.log(`Lang-check succeeded via fallback model: ${model}`)
      }
      return NextResponse.json({ issues: result.issues ?? [] })
    } catch (err) {
      console.error(`Gemini [${model}] lang-check fetch error:`, err)
      if (model !== FALLBACK_MODEL) continue
    }
  }

  return NextResponse.json({ error: 'Language check API failed' }, { status: 502 })
}
