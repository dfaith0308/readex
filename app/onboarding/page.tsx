// app/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const INDUSTRIES = ['스타트업', '자영업', '대기업', '중소기업', '프리랜서', '기타']
const JOB_TYPES = ['대표/CEO', '기획자', '마케터', '영업', '개발자', '디자이너', '강사/코치', '기타']
const GOALS = ['사업 성장', '커리어 발전', '자기계발', '콘텐츠 제작', '지식 축적']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [industry, setIndustry] = useState('')
  const [jobType, setJobType] = useState('')
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFinish = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    await supabase
      .from('profiles')
      .update({ industry, job_type: jobType, goal, onboarding_done: true })
      .eq('id', user.id)

    router.push('/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-16 max-w-sm mx-auto">
      {/* 진행바 */}
      <div className="flex gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-black' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">어떤 분야에서 일하시나요?</h2>
            <p className="text-sm text-gray-500 mt-1">AI가 맞춤 해석을 제공합니다</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map((item) => (
              <button
                key={item}
                onClick={() => setIndustry(item)}
                className={`h-12 rounded-xl border text-sm font-medium transition-all ${
                  industry === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!industry}
            className="w-full h-12 bg-black text-white rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">직무/역할은 무엇인가요?</h2>
            <p className="text-sm text-gray-500 mt-1">실행 아이템을 직무에 맞게 생성합니다</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {JOB_TYPES.map((item) => (
              <button
                key={item}
                onClick={() => setJobType(item)}
                className={`h-12 rounded-xl border text-sm font-medium transition-all ${
                  jobType === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 h-12 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm"
            >
              이전
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!jobType}
              className="flex-1 h-12 bg-black text-white rounded-xl font-semibold text-sm disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">독서 목적이 무엇인가요?</h2>
            <p className="text-sm text-gray-500 mt-1">어떤 실행을 도출할지 결정됩니다</p>
          </div>
          <div className="space-y-3">
            {GOALS.map((item) => (
              <button
                key={item}
                onClick={() => setGoal(item)}
                className={`w-full h-12 rounded-xl border text-sm font-medium transition-all ${
                  goal === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 h-12 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm"
            >
              이전
            </button>
            <button
              onClick={handleFinish}
              disabled={!goal || loading}
              className="flex-1 h-12 bg-black text-white rounded-xl font-semibold text-sm disabled:opacity-40"
            >
              {loading ? '저장 중...' : '시작하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
