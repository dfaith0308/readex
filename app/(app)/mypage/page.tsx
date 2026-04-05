// app/(app)/mypage/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/types'

const INDUSTRIES = ['스타트업', '자영업', '대기업', '중소기업', '프리랜서', '기타']
const JOB_TYPES = ['대표/CEO', '기획자', '마케터', '영업', '개발자', '디자이너', '강사/코치', '기타']
const GOALS = ['사업 성장', '커리어 발전', '자기계발', '콘텐츠 제작', '지식 축적']

export default function MyPage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [industry, setIndustry] = useState('')
  const [jobType, setJobType] = useState('')
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState({ highlights: 0, actions: 0, done: 0 })

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setIndustry(data.industry || '')
        setJobType(data.job_type || '')
        setGoal(data.goal || '')
      }

      const { count: h } = await supabase
        .from('highlights')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: a } = await supabase
        .from('action_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: d } = await supabase
        .from('action_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')

      setStats({ highlights: h || 0, actions: a || 0, done: d || 0 })
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ industry, job_type: jobType, goal })
      .eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="px-4 pt-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <p className="text-sm text-gray-500 mt-1">{profile?.email}</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-2xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.highlights}</p>
          <p className="text-xs text-gray-500 mt-1">인사이트</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.actions}</p>
          <p className="text-xs text-gray-500 mt-1">실행 생성</p>
        </div>
        <div className="rounded-2xl bg-black p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.done}</p>
          <p className="text-xs text-white/60 mt-1">실행 완료</p>
        </div>
      </div>

      {/* 설정 */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">내 업종</h2>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map((item) => (
              <button
                key={item}
                onClick={() => setIndustry(item)}
                className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                  industry === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">직무/역할</h2>
          <div className="grid grid-cols-2 gap-2">
            {JOB_TYPES.map((item) => (
              <button
                key={item}
                onClick={() => setJobType(item)}
                className={`h-11 rounded-xl border text-sm font-medium transition-all ${
                  jobType === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">독서 목적</h2>
          <div className="space-y-2">
            {GOALS.map((item) => (
              <button
                key={item}
                onClick={() => setGoal(item)}
                className={`w-full h-11 rounded-xl border text-sm font-medium transition-all ${
                  goal === item
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-black text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-gray-900 transition-colors"
        >
          {saved ? '✓ 저장 완료' : saving ? '저장 중...' : '설정 저장'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full h-12 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-400 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
