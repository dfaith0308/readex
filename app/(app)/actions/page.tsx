// app/(app)/actions/page.tsx
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import ActionCard from '@/components/actions/ActionCard'

type TabType = 'today' | 'week' | 'pending' | 'done'

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const tab = (searchParams.tab as TabType) || 'today'

  let query = supabase
    .from('action_items')
    .select(`
      *,
      highlight:highlights(content, book:books(title))
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (tab === 'today') {
    query = query.eq('action_type', 'today').eq('status', 'pending')
  } else if (tab === 'week') {
    query = query.eq('action_type', 'week').eq('status', 'pending')
  } else if (tab === 'pending') {
    query = query
      .in('action_type', ['idea', 'question', 'experiment'])
      .eq('status', 'pending')
  } else if (tab === 'done') {
    query = query.eq('status', 'done')
  }

  const { data: actions } = await query

  const { count: todayCount } = await supabase
    .from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action_type', 'today')
    .eq('status', 'pending')

  const { count: weekCount } = await supabase
    .from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('action_type', 'week')
    .eq('status', 'pending')

  const { count: pendingCount } = await supabase
    .from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('action_type', ['idea', 'question', 'experiment'])
    .eq('status', 'pending')

  const { count: doneCount } = await supabase
    .from('action_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'done')

  const tabs = [
    { key: 'today', label: '오늘', count: todayCount || 0 },
    { key: 'week', label: '이번 주', count: weekCount || 0 },
    { key: 'pending', label: '보류', count: pendingCount || 0 },
    { key: 'done', label: '완료', count: doneCount || 0 },
  ]

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">실행</h1>
        <p className="text-sm text-gray-500 mt-1">AI가 만든 실행 아이템</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/actions?tab=${t.key}`}
            className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`ml-1 ${
                  tab === t.key ? 'text-black' : 'text-gray-400'
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* 실행 목록 */}
      {actions && actions.length > 0 ? (
        <div className="space-y-3">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">
            {tab === 'done' ? '🎉' : '✅'}
          </p>
          <p className="text-sm font-medium text-gray-600">
            {tab === 'done'
              ? '아직 완료한 항목이 없습니다'
              : '이 탭에 실행 항목이 없습니다'}
          </p>
          {tab !== 'done' && (
            <Link
              href="/input"
              className="inline-block mt-4 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-semibold"
            >
              하이라이트 입력하기
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
