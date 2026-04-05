// app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { analyzeHighlight } from '@/lib/ai'
import { AnalyzeOutput } from '@/types'

function isValidAnalyzeOutput(result: unknown): result is AnalyzeOutput {
  if (!result || typeof result !== 'object') return false
  const r = result as Record<string, unknown>

  if (typeof r.summary !== 'string' || r.summary.trim().length === 0) return false
  if (typeof r.core_concept !== 'string') return false
  if (typeof r.why_important !== 'string') return false
  if (typeof r.application !== 'string') return false
  if (!Array.isArray(r.tags)) return false
  if (!r.actions || typeof r.actions !== 'object') return false

  const actions = r.actions as Record<string, unknown>
  if (typeof actions.today !== 'string' || actions.today.trim().length === 0) return false
  if (!Array.isArray(actions.week)) return false
  if (typeof actions.idea !== 'string') return false
  if (!Array.isArray(actions.questions)) return false

  return true
}

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 })
  }

  const { bookTitle, author, highlight, memo, purposeType } = body

  if (
    !highlight ||
    typeof highlight !== 'string' ||
    highlight.trim().length === 0
  ) {
    return NextResponse.json(
      { error: '하이라이트 내용을 입력해주세요' },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('industry, job_type, goal')
    .eq('id', user.id)
    .single()

  let result: AnalyzeOutput
  try {
    result = await analyzeHighlight({
      bookTitle: typeof bookTitle === 'string' ? bookTitle : '',
      author: typeof author === 'string' ? author : '',
      highlight: highlight.trim(),
      memo: typeof memo === 'string' ? memo : '',
      purposeType: typeof purposeType === 'string' ? purposeType : 'business',
      profile: profile ?? {},
    })
  } catch (err) {
    console.error('[AI analyze error] analyzeHighlight threw:', err)
    return NextResponse.json(
      { error: 'AI 분석 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }

  if (!isValidAnalyzeOutput(result)) {
    console.error('[Invalid response] AI result failed structure check:', result)
    return NextResponse.json(
      { error: 'AI 응답 구조가 올바르지 않습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }

  return NextResponse.json(result)
}
