// app/api/ai/analyze-batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { analyzeBatch } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 형식 오류' }, { status: 400 })
  }

  const { highlights, purposeType, context, business_connection } = body

  if (!Array.isArray(highlights) || highlights.length === 0) {
    return NextResponse.json({ error: '하이라이트가 없습니다' }, { status: 400 })
  }

  const validHighlights = (highlights as unknown[]).filter(
    (h): h is string => typeof h === 'string' && h.trim().length > 0
  )

  if (validHighlights.length === 0) {
    return NextResponse.json({ error: '유효한 하이라이트가 없습니다' }, { status: 400 })
  }

  const warning = validHighlights.length > 10 ? '최대 10개만 처리됨' : null
  const limitedHighlights = validHighlights.slice(0, 10)

  const { data: profile } = await supabase
    .from('profiles')
    .select('industry, job_type, goal')
    .eq('id', user.id)
    .single()

  const { bookTitle, author } = body

  try {
    const result = await analyzeBatch({
      highlights: limitedHighlights,
      purposeType: typeof purposeType === 'string' ? purposeType : 'business',
      context: typeof context === 'string' ? context : undefined,
      business_connection: typeof business_connection === 'string' ? business_connection : undefined,
      profile: profile ?? {},
    })

    // 책 upsert
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
        const { data: newBook } = await supabase
          .from('books')
          .insert({
            user_id: user.id,
            title: bookTitle.trim(),
            author: typeof author === 'string' ? author.trim() : null,
          })
          .select('id')
          .single()
        bookId = newBook?.id ?? null
      }
    }

    // highlights batch insert
    const { data: insertedHighlights, error: hlBatchErr } = await supabase
      .from('highlights')
      .insert(
        result.items.map((item) => ({
          user_id: user.id,
          book_id: bookId,
          content: item.highlight,
          purpose_type: typeof purposeType === 'string' ? purposeType : 'business',
        }))
      )
      .select('id')

    if (hlBatchErr || !insertedHighlights) {
      console.error('[analyze-batch][ERROR]', {
        message: hlBatchErr?.message,
        userId: user.id,
      })
      return NextResponse.json({ error: '저장 실패' }, { status: 500 })
    }

    // ai_analyses + action_items 병렬 insert
    await Promise.all([
      supabase.from('ai_analyses').insert(
        result.items.map((item, i) => ({
          highlight_id: insertedHighlights[i].id,
          summary: item.summary,
          core_concept: item.core_concept,
          why_important: item.why_important,
          application: item.application,
          tags: item.tags,
        }))
      ),
      supabase.from('action_items').insert(
        result.items.flatMap((item, i) => {
          const hid = insertedHighlights[i].id
          const rows: {
            highlight_id: string
            user_id: string
            title: string
            action_type: string
            priority: number
          }[] = []
          if (item.actions.today.trim()) {
            rows.push({ highlight_id: hid, user_id: user.id, title: item.actions.today, action_type: 'today', priority: 1 })
          }
          item.actions.week.forEach((w) => {
            if (w.trim()) rows.push({ highlight_id: hid, user_id: user.id, title: w, action_type: 'week', priority: 2 })
          })
          if (item.actions.idea.trim()) {
            rows.push({ highlight_id: hid, user_id: user.id, title: item.actions.idea, action_type: 'idea', priority: 2 })
          }
          return rows
        })
      ),
      supabase.from('group_insights').insert({
        user_id: user.id,
        book_id: bookId,
        summary: result.group_insight.summary,
        strategy: result.group_insight.strategy,
        opportunity: result.group_insight.opportunity,
      }),
    ])

    } catch (err) {
    console.error('[analyze-batch][ERROR]', {
      message: err instanceof Error ? err.message : String(err),
      userId: user.id,
    })
    return NextResponse.json({ error: '분석 실패' }, { status: 500 })
  }
}