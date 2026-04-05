// app/(app)/home/page.tsx
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { formatDate, getWeekStart } from '@/lib/utils'

export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, industry, job_type, goal')
    .eq('id', user.id)
    .single()

  // 오늘 실행 아이템 (pending)
  const { data: todayActions } = await supabase
    .from('action_items')
    .select('*, highlight:highlights(content, book:books(title))')
    .eq('user_id', user.id)
    .eq('action_type', 'today')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(3)

  // 최근 하이라이트
  const { data: recentHighlights } = await supabase
    .from('highlights')
    .select('*, ai_analysis:ai_analyses(*), book:books(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // 이번 주 통계
  const weekStart = getWeekStart()
  const { count: weekTotal } = await supabase
    .from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', weekStart.toISOString())

  const { count: weekDone } = await supabase
    .from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('created_at', weekStart.toISOString())

  const completionRate =
    weekTotal && weekTotal > 0
      ? Math.round(((weekDone || 0) / weekTotal) * 100)
      : 0

  const { count: totalHighlights } = await supabase
    .from('highlights')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const firstName = profile?.name?.split(' ')[0] || '사용자'
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? '좋은 아침이에요' : hour < 18 ? '안녕하세요' : '수고했어요'

  return (
    <div className="px-4 pt-6 pb-28 space-y-5">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-gray-500">{greeting},</p>
        <h1 className="text-2xl font-bold text-gray-900">{firstName}님 👋</h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-black p-4 text-white">
          <p className="text-xs opacity-60 mb-1">이번 주 실행률</p>
          <p className="text-3xl font-bold">{completionRate}%</p>
          <p className="text-xs opacity-60 mt-1">
            {weekDone || 0} / {weekTotal || 0} 완료
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">저장된 인사이트</p>
          <p className="text-3xl font-bold text-gray-900">{totalHighlights || 0}</p>
          <p className="text-xs text-gray-500 mt-1">누적 하이라이트</p>
        </div>
      </div>

      {/* 오늘 할 일 */}
      {todayActions && todayActions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">오늘 할 일</h2>
            <Link href="/actions" className="text-xs text-gray-400 hover:text-gray-700">
              전체 보기 →
            </Link>
          </div>
          <div className="space-y-2">
            {todayActions.map((action) => (
              <div
                key={action.id}
                className="rounded-2xl border border-gray-100 p-4 bg-white"
              >
                <p className="text-sm font-medium text-gray-900 leading-snug">
                  {action.title}
                </p>
                {action.highlight?.book && (
                  <p className="text-xs text-gray-400 mt-1">
                    📚 {action.highlight.book.title}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오늘 다시 볼 인사이트 */}
      {recentHighlights && recentHighlights[0] && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">오늘 다시 볼 문장</h2>
          <Link href={`/library/${recentHighlights[0].id}`}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-400 transition-colors">
              <div className="bg-gray-50 px-5 py-4">
                <p className="text-xs text-gray-400 mb-1">
                  📚 {recentHighlights[0].book?.title || '책 제목 없음'}
                </p>
                <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                  &ldquo;{recentHighlights[0].content}&rdquo;
                </p>
              </div>
              {recentHighlights[0].ai_analysis && (
                <div className="px-5 py-3 bg-white">
                  <p className="text-xs text-gray-400 mb-1">AI 요약</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {recentHighlights[0].ai_analysis.summary}
                  </p>
                </div>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* 최근 저장 */}
      {recentHighlights && recentHighlights.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">최근 저장</h2>
            <Link href="/library" className="text-xs text-gray-400 hover:text-gray-700">
              전체 보기 →
            </Link>
          </div>
          <div className="space-y-2">
            {recentHighlights.slice(1, 4).map((h) => (
              <Link key={h.id} href={`/library/${h.id}`}>
                <div className="rounded-xl border border-gray-100 p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">
                        {h.book?.title || '책 없음'}
                      </p>
                      <p className="text-sm text-gray-800 line-clamp-2">{h.content}</p>
                      {h.ai_analysis && (
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          → {h.ai_analysis.summary}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 shrink-0">
                      {formatDate(h.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 첫 입력 유도 (하이라이트 없을 때) */}
      {(!recentHighlights || recentHighlights.length === 0) && (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">📖</p>
          <p className="text-base font-semibold text-gray-900 mb-1">
            첫 하이라이트를 입력해보세요
          </p>
          <p className="text-sm text-gray-500 mb-6">
            책에서 마음에 든 문장을 AI가 실행으로 바꿔드립니다
          </p>
          <Link
            href="/input"
            className="inline-block px-6 py-3 bg-black text-white rounded-xl font-semibold text-sm"
          >
            ⚡ 첫 문장 입력하기
          </Link>
        </div>
      )}
    </div>
  )
}
