// app/(app)/actions/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ActionItem, Reflection } from '@/types'
import { formatDate } from '@/lib/utils'

const ACTION_TYPE_LABEL: Record<string, string> = {
  today: '오늘 할 일',
  week: '이번 주 과제',
  idea: '💡 아이디어',
  question: '❓ 핵심 질문',
  experiment: '🧪 실험 항목',
}

export default function ActionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [action, setAction] = useState<ActionItem | null>(null)
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [resultNote, setResultNote] = useState('')
  const [score, setScore] = useState<number>(0)
  const [completing, setCompleting] = useState(false)
  const [savingReflection, setSavingReflection] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAction = async () => {
      const { data } = await supabase
        .from('action_items')
        .select('*, highlight:highlights(content, book:books(title))')
        .eq('id', params.id as string)
        .single()

      if (data) {
        setAction(data)

        const { data: ref } = await supabase
          .from('reflections')
          .select('*')
          .eq('action_item_id', params.id as string)
          .single()

        if (ref) {
          setReflection(ref)
          setResultNote(ref.result_note || '')
          setScore(ref.usefulness_score || 0)
        }
      }
      setLoading(false)
    }
    fetchAction()
  }, [params.id])

  const handleComplete = async () => {
    if (!action) return
    setCompleting(true)
    await fetch(`/api/actions/${action.id}/complete`, { method: 'POST' })
    setAction((prev) =>
      prev ? { ...prev, status: 'done', completed_at: new Date().toISOString() } : prev
    )
    setCompleting(false)
  }

  const handleSaveReflection = async () => {
    if (!action) return
    setSavingReflection(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (reflection) {
      await supabase
        .from('reflections')
        .update({ result_note: resultNote, usefulness_score: score })
        .eq('id', reflection.id)
    } else {
      const { data } = await supabase
        .from('reflections')
        .insert({
          action_item_id: action.id,
          user_id: user.id,
          result_note: resultNote,
          usefulness_score: score,
        })
        .select()
        .single()
      if (data) setReflection(data)
    }
    setSavingReflection(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  if (!action) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">항목을 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-28">
      <Link
        href="/actions"
        className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block"
      >
        ← 실행 목록
      </Link>

      {/* 타입 배지 */}
      <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600 mb-3">
        {ACTION_TYPE_LABEL[action.action_type]}
      </span>

      {/* 제목 */}
      <h1
        className={`text-xl font-bold leading-snug mb-2 ${
          action.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'
        }`}
      >
        {action.title}
      </h1>

      {/* 연결된 하이라이트 */}
      {action.highlight && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 mb-5">
          <p className="text-xs text-gray-400 mb-1">
            📚{' '}
            {(action.highlight as any).book?.title || '책 없음'}
          </p>
          <p className="text-sm text-gray-700 line-clamp-3">
            {(action.highlight as any).content}
          </p>
        </div>
      )}

      {/* 날짜 */}
      <p className="text-xs text-gray-400 mb-6">
        생성 {formatDate(action.created_at)}
        {action.completed_at && (
          <span className="ml-2 text-green-500">
            · 완료 {formatDate(action.completed_at)}
          </span>
        )}
      </p>

      {/* 완료 버튼 */}
      {action.status === 'pending' && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full h-12 bg-black text-white rounded-xl font-semibold text-sm mb-6 disabled:opacity-50 hover:bg-gray-900 transition-colors"
        >
          {completing ? '처리 중...' : '✓ 완료 처리'}
        </button>
      )}

      {action.status === 'done' && (
        <div className="w-full h-12 flex items-center justify-center rounded-xl bg-green-50 text-green-600 font-semibold text-sm mb-6">
          ✓ 완료된 항목
        </div>
      )}

      {/* 회고 섹션 */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">회고</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            실제 결과 또는 느낀 점
          </label>
          <textarea
            value={resultNote}
            onChange={(e) => setResultNote(e.target.value)}
            placeholder="이 실행이 어떤 변화를 만들었나요?"
            className="w-full h-28 px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이 인사이트가 얼마나 도움이 됐나요?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setScore(s)}
                className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition-all ${
                  score === s
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">별로</span>
            <span className="text-[10px] text-gray-400">매우 도움</span>
          </div>
        </div>

        <button
          onClick={handleSaveReflection}
          disabled={savingReflection || (!resultNote && !score)}
          className="w-full h-11 border border-gray-200 text-gray-800 rounded-xl font-medium text-sm disabled:opacity-40 hover:border-gray-400 transition-colors"
        >
          {savingReflection ? '저장 중...' : reflection ? '회고 수정' : '회고 저장'}
        </button>
      </div>
    </div>
  )
}
