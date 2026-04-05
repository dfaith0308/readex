// app/(app)/library/[id]/page.tsx
import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ActionCard from '@/components/actions/ActionCard'

export default async function HighlightDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: highlight } = await supabase
    .from('highlights')
    .select(`
      *,
      book:books(id, title, author),
      ai_analysis:ai_analyses(*),
      action_items(*)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!highlight) notFound()

  const analysis = highlight.ai_analysis

  return (
    <div className="px-4 pt-6 pb-28">
      {/* 뒤로 */}
      <Link href="/library" className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block">
        ← 라이브러리
      </Link>

      {/* 책 정보 */}
      <div className="mb-4">
        <p className="text-xs text-gray-400">
          📚 {highlight.book?.title || '책 없음'}
          {highlight.book?.author && (
            <span className="ml-1 text-gray-300">· {highlight.book.author}</span>
          )}
        </p>
        <p className="text-xs text-gray-300 mt-0.5">{formatDate(highlight.created_at)}</p>
      </div>

      {/* 원문 */}
      <div className="rounded-2xl bg-gray-50 px-5 py-5 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">원문</p>
        <p className="text-base text-gray-900 leading-relaxed">
          &ldquo;{highlight.content}&rdquo;
        </p>
        {highlight.memo && (
          <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-200">
            💬 {highlight.memo}
          </p>
        )}
      </div>

      {/* AI 분석 결과 */}
      {analysis ? (
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-5">
          {/* 요약 */}
          <div className="bg-black px-5 py-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">핵심 요약</p>
            <p className="text-white text-lg font-bold">{analysis.summary}</p>
          </div>

          <div className="divide-y divide-gray-100">
            {/* 핵심 개념 */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">핵심 개념</p>
              <p className="text-sm text-gray-800">{analysis.core_concept}</p>
            </div>

            {/* 왜 중요한가 */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">왜 중요한가</p>
              <p className="text-sm text-gray-800">{analysis.why_important}</p>
            </div>

            {/* 내 상황 적용 */}
            <div className="px-5 py-4 bg-blue-50">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">내 상황 적용</p>
              <p className="text-sm text-blue-900 font-medium">{analysis.application}</p>
            </div>

            {/* 태그 */}
            <div className="px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {analysis.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center mb-5">
          <p className="text-sm text-gray-400">AI 분석 결과가 없습니다</p>
        </div>
      )}

      {/* 실행 아이템 */}
      {highlight.action_items && highlight.action_items.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">실행 아이템</h2>
          <div className="space-y-2">
            {highlight.action_items.map((action: any) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
