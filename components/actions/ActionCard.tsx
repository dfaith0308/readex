// components/actions/ActionCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ActionItem } from '@/types'

interface Props {
  action: ActionItem
  onComplete?: (id: string) => void
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  today: { label: '오늘', color: 'bg-green-100 text-green-700' },
  week: { label: '이번 주', color: 'bg-blue-100 text-blue-700' },
  idea: { label: '💡 아이디어', color: 'bg-orange-100 text-orange-700' },
  question: { label: '❓ 질문', color: 'bg-purple-100 text-purple-700' },
  experiment: { label: '🧪 실험', color: 'bg-pink-100 text-pink-700' },
}

export default function ActionCard({ action, onComplete }: Props) {
  const [completing, setCompleting] = useState(false)
  const [done, setDone] = useState(action.status === 'done')

  const typeInfo = TYPE_LABEL[action.action_type] || {
    label: action.action_type,
    color: 'bg-gray-100 text-gray-600',
  }

  const handleComplete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (done || completing) return

    setCompleting(true)
    try {
      const res = await fetch(`/api/actions/${action.id}/complete`, {
        method: 'POST',
      })
      if (res.ok) {
        setDone(true)
        onComplete?.(action.id)
      }
    } catch {
      // 실패 시 상태 되돌리지 않음 (낙관적 업데이트 안 함)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <Link href={`/actions/${action.id}`}>
      <div
        className={`rounded-2xl border p-4 transition-all hover:border-gray-300 ${
          done
            ? 'border-gray-100 bg-gray-50'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* 완료 체크 버튼 */}
          <button
            onClick={handleComplete}
            disabled={done || completing}
            className={`shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              done
                ? 'border-green-500 bg-green-500 text-white'
                : completing
                ? 'border-gray-300 opacity-50'
                : 'border-gray-300 hover:border-black hover:bg-black hover:text-white'
            }`}
          >
            {(done || completing) && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
            )}
          </button>

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            {/* 타입 배지 */}
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1.5 ${typeInfo.color}`}
            >
              {typeInfo.label}
            </span>

            {/* 제목 */}
            <p
              className={`text-sm font-medium leading-snug ${
                done ? 'line-through text-gray-400' : 'text-gray-900'
              }`}
            >
              {action.title}
            </p>

            {/* 연결된 책 */}
            {action.highlight && (action.highlight as any).book && (
              <p className="text-xs text-gray-400 mt-1.5">
                📚 {(action.highlight as any).book.title}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
