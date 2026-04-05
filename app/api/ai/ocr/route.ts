// app/api/ai/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { image: string; mimeType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 형식 오류' }, { status: 400 })
  }

  const { image, mimeType = 'image/jpeg' } = body
  if (!image) return NextResponse.json({ error: '이미지가 없습니다' }, { status: 400 })

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '너는 JSON만 출력하는 OCR 엔진이다. 반드시 { "highlights": [...] } 형식으로만 응답해라.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${image}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: `이 책 페이지 이미지에서 형광펜, 밑줄, 강조 표시된 문장만 추출해라.

규칙:
- 강조 표시된 문장만 추출 (형광펜/밑줄/볼드 등)
- 강조 없는 일반 텍스트 절대 포함 금지
- 문장 단위로 반환 (불완전 문장 제거)
- 중복 제거
- 의미 단위 기준 (줄바꿈 기준 아님)
- 강조 표시 없으면 highlights를 빈 배열로 반환

반드시 아래 JSON 형식으로만 응답해라:
{ "highlights": ["문장1", "문장2", "문장3"] }`,
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    let parsed: { highlights?: unknown[] }
    try {
      parsed = JSON.parse(raw) as { highlights?: unknown[] }
    } catch {
      console.error('[OCR parse error] raw:', raw)
      return NextResponse.json({ highlights: [] })
    }

    const raw = (parsed.highlights ?? []).filter(
      (h): h is string => typeof h === 'string' && h.trim().length > 0
    )

    // 품질 필터: 10자 이하 제거 + 중복 제거 + 최대 10개
    const seen = new Set<string>()
    const highlights = raw
      .filter((h) => {
        if (h.length <= 10) return false
        if (seen.has(h)) return false
        seen.add(h)
        return true
      })
      .slice(0, 10)

    if (highlights.length === 0) {
      return NextResponse.json({
        highlights: [],
        reason: raw.length > 0 ? '이미지 품질 문제' : '강조 표시 없음',
      })
    }

    return NextResponse.json({ highlights, reason: null })
  } catch (err) {
    console.error('[OCR][ERROR]', {
      message: err instanceof Error ? err.message : String(err),
      userId: user.id,
    })
    return NextResponse.json({ error: 'OCR 처리 실패', reason: '인식 실패' }, { status: 500 })
  }
}