// components/input/AIResultCard.tsx
import { AnalyzeOutput } from '@/types'

interface Props {
  result: AnalyzeOutput
}

const TAG_COLORS: Record<string, string> = {
  전략: 'bg-purple-100 text-purple-700',
  성장: 'bg-green-100 text-green-700',
  마케팅: 'bg-blue-100 text-blue-700',
  영업: 'bg-orange-100 text-orange-700',
  브랜딩: 'bg-pink-100 text-pink-700',
  고객관리: 'bg-yellow-100 text-yellow-700',
  제품: 'bg-cyan-100 text-cyan-700',
  운영: 'bg-gray-100 text-gray-600',
  조직: 'bg-indigo-100 text-indigo-700',
  재무: 'bg-emerald-100 text-emerald-700',
  마인드셋: 'bg-rose-100 text-rose-700',
  습관: 'bg-lime-100 text-lime-700',
  의사결정: 'bg-violet-100 text-violet-700',
  협상: 'bg-amber-100 text-amber-700',
}

export default function AIResultCard({ result }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      {/* 요약 헤더 */}
      <div className="bg-black px-5 py-4">
        <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">
          핵심 요약
        </p>
        <p className="text-white text-lg font-bold leading-snug">{result.summary}</p>
      </div>

      <div className="divide-y divide-gray-100">
        {/* 핵심 개념 */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            핵심 개념
          </p>
          <p className="text-sm text-gray-800">{result.core_concept}</p>
        </div>

        {/* 왜 중요한가 */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            왜 중요한가
          </p>
          <p className="text-sm text-gray-800">{result.why_important}</p>
        </div>

        {/* 내 상황 적용 */}
        <div className="px-5 py-4 bg-blue-50">
          <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1">
            내 상황 적용
          </p>
          <p className="text-sm text-blue-900 font-medium leading-relaxed">
            {result.application}
          </p>
        </div>

        {/* 오늘 할 일 */}
        <div className="px-5 py-4 bg-green-50">
          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-1">
            오늘 할 일
          </p>
          <p className="text-sm text-green-900 font-bold">→ {result.actions.today}</p>
        </div>

        {/* 이번 주 실행 과제 */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            이번 주 실행 과제
          </p>
          <ul className="space-y-1.5">
            {result.actions.week.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-gray-300 shrink-0 font-mono">{i + 1}.</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 사업/제품 아이디어 */}
        <div className="px-5 py-4 bg-orange-50">
          <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest mb-1">
            💡 사업/제품 아이디어
          </p>
          <p className="text-sm text-orange-900 font-medium leading-relaxed">
            {result.actions.idea}
          </p>
        </div>

        {/* 핵심 질문 */}
        {result.actions.questions && result.actions.questions.length > 0 && (
          <div className="px-5 py-4 bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              핵심 질문
            </p>
            <ul className="space-y-1.5">
              {result.actions.questions.map((q, i) => (
                <li key={i} className="text-sm text-gray-700">
                  ❓ {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 태그 */}
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  TAG_COLORS[tag] || 'bg-gray-100 text-gray-600'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
