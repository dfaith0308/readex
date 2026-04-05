// components/input/BatchResultCard.tsx
import { BatchAnalyzeOutput } from '@/types'

interface Props {
  result: BatchAnalyzeOutput
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

export default function BatchResultCard({ result }: Props) {
  return (
    <div className="space-y-4">
      {/* 그룹 인사이트 */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-black px-5 py-4">
          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">
            통합 인사이트
          </p>
          <p className="text-white text-lg font-bold leading-snug">
            {result.group_insight.summary}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-5 py-4 bg-blue-50">
            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1">
              전략 방향
            </p>
            <p className="text-sm text-blue-900 font-medium leading-relaxed">
              {result.group_insight.strategy}
            </p>
          </div>
          <div className="px-5 py-4 bg-orange-50">
            <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest mb-1">
              💡 사업 기회
            </p>
            <p className="text-sm text-orange-900 font-medium leading-relaxed">
              {result.group_insight.opportunity}
            </p>
          </div>
        </div>
      </div>

      {/* 개별 항목 */}
      <div className="space-y-3">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
            {/* 원문 */}
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-xs text-gray-400 mb-0.5">{i + 1}번 하이라이트</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                &ldquo;{item.highlight}&rdquo;
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {/* 요약 */}
              <div className="px-4 py-3">
                <p className="text-xs font-bold text-gray-900">{item.summary}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.core_concept}</p>
              </div>

              {/* 적용 */}
              <div className="px-4 py-3 bg-blue-50">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-0.5">
                  적용
                </p>
                <p className="text-xs text-blue-900">{item.application}</p>
              </div>

              {/* 오늘 할 일 */}
              <div className="px-4 py-3 bg-green-50">
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-0.5">
                  오늘 할 일
                </p>
                <p className="text-xs text-green-900 font-bold">→ {item.actions.today}</p>
              </div>

              {/* 태그 */}
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
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
        ))}
      </div>
    </div>
  )
}