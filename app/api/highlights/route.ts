// app/api/highlights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { AnalyzeOutput, AnalyzeActions } from '@/types'

function isValidActions(actions: unknown): actions is AnalyzeActions {
  if (!actions || typeof actions !== 'object') return false
  const a = actions as Record<string, unknown>
  if (typeof a.today !== 'string') return false
  if (!Array.isArray(a.week)) return false
  if (typeof a.idea !== 'string') return false
  if (!Array.isArray(a.questions)) return false
  return true
}

function isValidAIResult(aiResult: unknown): aiResult is AnalyzeOutput {
  if (!aiResult || typeof aiResult !== 'object') return false
  const r = aiResult as Record<string, unknown>
  if (typeof r.summary !== 'string') return false
  if (typeof r.core_concept !== 'string') return false
  if (typeof r.why_important !== 'string') return false
  if (typeof r.application !== 'string') return false
  if (!Array.isArray(r.tags)) return false
  if (!isValidActions(r.actions)) return false
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

  const { bookTitle, author, content, memo, purposeType, aiResult, actions } = body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json(
      { error: '하이라이트 내용이 필요합니다' },
      { status: 400 }
    )
  }

  // aiResult 검증
  const validatedAIResult = isValidAIResult(aiResult) ? aiResult : null
  if (aiResult && !validatedAIResult) {
    console.error('[Invalid response] aiResult structure invalid:', aiResult)
  }

  // actions 검증
  const validatedActions = isValidActions(actions) ? actions : null
  if (actions && !validatedActions) {
    console.error('[Invalid response] actions structure invalid:', actions)
  }

  // 1. 책 upsert
  let bookId: string | null = null

  if (typeof bookTitle === 'string' && bookTitle.trim().length > 0) {
    const { data: existingBook } = await supabase
      .from('books')
      .select('id')
      .eq('user_id', user.id)
      .eq('title', bookTitle.trim())
      .single()

    if (existingBook) {
      bookId = existingBook.id
    } else {
      const { data: newBook, error: bookErr } = await supabase
        .from('books')
        .insert({
          user_id: user.id,
          title: bookTitle.trim(),
          author: typeof author === 'string' && author.trim().length > 0
            ? author.trim()
            : null,
        })
        .select('id')
        .single()

      if (bookErr) {
        console.error('[AI analyze error] Book insert failed:', bookErr)
      } else if (newBook) {
        bookId = newBook.id
      }
    }
  }

  // 2. 하이라이트 저장
  const { data: highlight, error: hlErr } = await supabase
    .from('highlights')
    .insert({
      user_id: user.id,
      book_id: bookId,
      content: (content as string).trim(),
      memo: typeof memo === 'string' && memo.trim().length > 0 ? memo.trim() : null,
      purpose_type: typeof purposeType === 'string' ? purposeType : 'business',
    })
    .select('id')
    .single()

  if (hlErr || !highlight) {
    console.error('[AI analyze error] Highlight insert failed:', hlErr)
    return NextResponse.json({ error: '하이라이트 저장 실패' }, { status: 500 })
  }

  // 3. AI 분석 결과 저장 (검증 통과한 경우만)
  if (validatedAIResult) {
    const { error: aiErr } = await supabase.from('ai_analyses').insert({
      highlight_id: highlight.id,
      summary: validatedAIResult.summary,
      core_concept: validatedAIResult.core_concept,
      why_important: validatedAIResult.why_important,
      application: validatedAIResult.application,
      tags: validatedAIResult.tags,
    })
    if (aiErr) {
      console.error('[AI analyze error] ai_analyses insert failed:', aiErr)
    }
  }

  // 4. 실행 아이템 생성 (검증 통과한 경우만)
  if (validatedActions) {
    const actionRows: {
      highlight_id: string
      user_id: string
      title: string
      action_type: string
      priority: number
    }[] = []

    if (validatedActions.today.trim()) {
      actionRows.push({
        highlight_id: highlight.id,
        user_id: user.id,
        title: validatedActions.today.trim(),
        action_type: 'today',
        priority: 1,
      })
    }

    validatedActions.week.forEach((w) => {
      if (typeof w === 'string' && w.trim()) {
        actionRows.push({
          highlight_id: highlight.id,
          user_id: user.id,
          title: w.trim(),
          action_type: 'week',
          priority: 2,
        })
      }
    })

    if (typeof validatedActions.idea === 'string' && validatedActions.idea.trim()) {
      actionRows.push({
        highlight_id: highlight.id,
        user_id: user.id,
        title: validatedActions.idea.trim(),
        action_type: 'idea',
        priority: 2,
      })
    }

    validatedActions.questions.forEach((q) => {
      if (typeof q === 'string' && q.trim()) {
        actionRows.push({
          highlight_id: highlight.id,
          user_id: user.id,
          title: q.trim(),
          action_type: 'question',
          priority: 3,
        })
      }
    })

    if (actionRows.length > 0) {
      const { error: actErr } = await supabase
        .from('action_items')
        .insert(actionRows)
      if (actErr) {
        console.error('[AI analyze error] action_items insert failed:', actErr)
      }
    }
  }

  return NextResponse.json({ id: highlight.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  const purposeType = searchParams.get('purposeType')
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50

  let query = supabase
    .from('highlights')
    .select(`
      *,
      book:books(id, title, author),
      ai_analysis:ai_analyses(id, summary, tags),
      action_items(id, status)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (bookId) {
    query = query.eq('book_id', bookId)
  }

  if (purposeType) {
    query = query.eq('purpose_type', purposeType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[AI analyze error] highlights GET failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
