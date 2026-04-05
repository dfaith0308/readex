// app/(app)/library/page.tsx
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

const TAG_COLORS: Record<string, string> = {
  전략: 'bg-purple-100 text-purple-700',
  성장: 'bg-green-100 text-green-700',
  마케팅: 'bg-blue-100 text-blue-700',
  영업: 'bg-orange-100 text-orange-700',
  브랜딩: 'bg-pink-100 text-pink-700',
  고객관리: 'bg-yellow-100 text-yellow-700',
  제품: 'bg-cyan-100 text-cyan-700',
  운영: 'bg-gray-100 text-gray-700',
  조직: 'bg-indigo-100 text-indigo-700',
  재무: 'bg-emerald-100 text-emerald-700',
  마인드셋: 'bg-rose-100 text-rose-700',
  습관: 'bg-lime-100 text-lime-700',
  의사결정: 'bg-violet-100 text-violet-700',
  협상: 'bg-amber-100 text-amber-700',
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { tag?: string; purpose?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

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

  if (searchParams.purpose) {
    query = query.eq('purpose_type', searchParams.purpose)
  }

  const { data: highlights } = await query

  // 태그 필터 (클라이언트에서 처리)
  const filtered = searchParams.tag
    ? highlights?.filter((h) =>
        h.ai_analysis?.tags?.includes(searchParams.tag!)
      )
    : highlights

  // 전체 태그 목록 수집
  const allTags = Array.from(
    new Set(
      highlights?.flatMap((h) => h.ai_analysis?.tags || []) || []
    )
  ).slice(0, 12)

  const purposeOptions = [
    { value: '', label: '전체' },
    { value: 'business', label: '사업' },
    { value: 'work', label: '일' },
    { value: 'life', label: '삶' },
    { value: 'content', label: '콘텐츠' },
  ]

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">라이브러리</h1>
        <p className="text-sm text-gray-500 mt-1">
          {filtered?.length || 0}개의 인사이트
        </p>
      </div>

      {/* 목적 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {purposeOptions.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value ? `/library?purpose=${opt.value}` : '/library'}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              searchParams.purpose === opt.value ||
              (!searchParams.purpose && !opt.value)
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {allTags.map((tag) => (
            <Link
              key={tag}
              href={
                searchParams.tag === tag
                  ? '/library'
                  : `/library?tag=${tag}`
              }
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                searchParams.tag === tag
                  ? 'bg-black text-white'
                  : TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* 하이라이트 목록 */}
      {filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((h) => {
            const doneCount =
              h.action_items?.filter((a: { status: string }) => a.status === 'done').length || 0
            const totalCount = h.action_items?.length || 0

            return (
              <Link key={h.id} href={`/library/${h.id}`}>
                <div className="rounded-2xl border border-gray-100 p-4 hover:border-gray-300 transition-colors">
                  {/* 책 제목 */}
                  <p className="text-xs text-gray-400 mb-2">
                    📚 {h.book?.title || '책 없음'}
                    {h.book?.author && (
                      <span className="ml-1 text-gray-300">· {h.book.author}</span>
                    )}
                  </p>

                  {/* 하이라이트 본문 */}
                  <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed mb-2">
                    {h.content}
                  </p>

                  {/* AI 요약 */}
                  {h.ai_analysis?.summary && (
                    <p className="text-xs font-semibold text-gray-500 mb-3">
                      → {h.ai_analysis.summary}
                    </p>
                  )}

                  {/* 하단 정보 */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {h.ai_analysis?.tags?.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {totalCount > 0 && (
                        <span className="text-xs text-gray-400">
                          ✓ {doneCount}/{totalCount}
                        </span>
                      )}
                      <span className="text-xs text-gray-300">
                        {formatDate(h.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm font-medium text-gray-600">저장된 하이라이트가 없습니다</p>
          <Link
            href="/input"
            className="inline-block mt-4 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-semibold"
          >
            첫 하이라이트 입력
          </Link>
        </div>
      )}
    </div>
  )
}
