// components/input/HighlightForm.tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnalyzeOutput, BatchAnalyzeOutput } from '@/types'
import AIResultCard from './AIResultCard'
import BatchResultCard from './BatchResultCard'
import ImageUpload from './ImageUpload'

const PURPOSE_OPTIONS = [
  { value: 'business', label: '🚀 사업' },
  { value: 'work', label: '💼 일' },
  { value: 'life', label: '🌱 삶' },
  { value: 'content', label: '✍️ 콘텐츠' },
]

type ErrorKind = 'network' | 'server' | 'input' | null

interface AnalyzeError {
  kind: ErrorKind
  message: string
}

function getErrorMessage(kind: ErrorKind, serverMessage?: string): string {
  switch (kind) {
    case 'network':
      return '네트워크 연결을 확인해주세요. 인터넷이 연결되어 있는지 확인 후 다시 시도하세요.'
    case 'server':
      return serverMessage || 'AI 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    case 'input':
      return serverMessage || '입력 내용을 확인해주세요.'
    default:
      return '알 수 없는 오류가 발생했습니다.'
  }
}

export default function HighlightForm() {
  const router = useRouter()
  const analyzingRef = useRef(false)

  const [bookTitle, setBookTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [memo, setMemo] = useState('')
  const [context, setContext] = useState('')
  const [businessConnection, setBusinessConnection] = useState('')
  const [purposeType, setPurposeType] = useState('business')
  const [isBatch, setIsBatch] = useState(false)

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<AnalyzeError | null>(null)
  const [result, setResult] = useState<AnalyzeOutput | BatchAnalyzeOutput | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleOCRExtracted = (extracted: string[]) => {
    setIsBatch(true)
    setContent((prev) => {
      const existing = prev.trim()
      const appended = extracted.join('\n')
      return existing ? `${existing}\n${appended}` : appended
    })
  }

  const handleAnalyze = async () => {
    const allLines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    if (allLines.length === 0) return
    if (analyzingRef.current) return

    const lines = allLines.slice(0, 10)
    if (allLines.length > 10) {
      console.warn(`[HighlightForm] ${allLines.length}개 입력 중 10개만 처리`)
    }

    const batch = lines.length > 1
    setIsBatch(batch)

    analyzingRef.current = true
    setAnalyzing(true)
    setAnalyzeError(null)
    setResult(null)

    const endpoint = batch ? '/api/ai/analyze-batch' : '/api/ai/analyze'
    const bodyPayload = batch
      ? {
          highlights: lines,
          purposeType,
          context: context.trim() || undefined,
          business_connection: businessConnection.trim() || undefined,
          bookTitle: bookTitle.trim(),
          author: author.trim(),
        }
      : {
          bookTitle: bookTitle.trim(),
          author: author.trim(),
          highlight: lines[0],
          memo: memo.trim(),
          purposeType,
          context: context.trim() || undefined,
          business_connection: businessConnection.trim() || undefined,
        }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      })

      if (res.status === 400) {
        const err = await res.json() as { error?: string }
        setAnalyzeError({ kind: 'input', message: getErrorMessage('input', err.error) })
        return
      }

      if (res.status >= 500) {
        let serverMessage: string | undefined
        try {
          const err = await res.json() as { error?: string }
          serverMessage = err.error
        } catch { /* 무시 */ }
        setAnalyzeError({ kind: 'server', message: getErrorMessage('server', serverMessage) })
        return
      }

      if (!res.ok) {
        setAnalyzeError({ kind: 'server', message: getErrorMessage('server') })
        return
      }

      const data = await res.json() as AnalyzeOutput | BatchAnalyzeOutput
      setResult(data)
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setAnalyzeError({ kind: 'network', message: getErrorMessage('network') })
      } else {
        setAnalyzeError({ kind: 'server', message: getErrorMessage('server') })
      }
    } finally {
      setAnalyzing(false)
      analyzingRef.current = false
    }
  }

  const handleSave = async () => {
    if (!result || saving || isBatch) return
    setSaving(true)

    const singleResult = result as AnalyzeOutput

    try {
      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: bookTitle.trim(),
          author: author.trim(),
          content: content.trim(),
          memo: memo.trim(),
          purposeType,
          aiResult: singleResult,
          actions: singleResult.actions,
        }),
      })

      if (!res.ok) {
        let message = '저장에 실패했습니다'
        try {
          const err = await res.json() as { error?: string }
          if (err.error) message = err.error
        } catch { /* 무시 */ }
        alert(message)
        return
      }

      setSaved(true)
    } catch {
      alert('저장 중 네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setBookTitle('')
    setAuthor('')
    setContent('')
    setMemo('')
    setContext('')
    setBusinessConnection('')
    setPurposeType('business')
    setResult(null)
    setSaved(false)
    setIsBatch(false)
    setAnalyzeError(null)
  }

  if (saved) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="text-green-700 font-semibold text-sm mb-1">저장 완료!</p>
        <p className="text-green-600 text-xs mb-4">
          {isBatch ? `${(result as BatchAnalyzeOutput | null)?.items.length ?? ''}개 인사이트가 저장되었습니다` : '실행 아이템이 생성되었습니다'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/actions')}
            className="flex-1 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            실행 탭 보기
          </button>
          <button
            onClick={handleReset}
            className="flex-1 h-10 border border-green-300 text-green-700 rounded-xl text-sm font-medium hover:border-green-500 transition-colors"
          >
            새로 입력
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 책 정보 */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="책 제목"
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          disabled={analyzing}
          className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition disabled:opacity-50 disabled:bg-gray-50"
        />
        <input
          type="text"
          placeholder="저자 (선택)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={analyzing}
          className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition disabled:opacity-50 disabled:bg-gray-50"
        />
      </div>

      {/* OCR 이미지 업로드 */}
      <ImageUpload onExtracted={handleOCRExtracted} />

      {/* 하이라이트 본문 */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">
          하이라이트 {content.split('\n').filter(l => l.trim()).length > 1 && (
            <span className="text-blue-500">
              ({Math.min(content.split('\n').filter(l => l.trim()).length, 10)}개 · 다중 분석 모드)
            </span>
          )}
        </p>
        <textarea
          placeholder={`하이라이트 문장을 입력하세요\n여러 문장은 줄바꿈으로 구분 (최대 10개)`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={analyzing}
          className="w-full min-h-[130px] px-4 py-3 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-black transition resize-none disabled:opacity-50 disabled:bg-gray-50"
        />
      </div>

      {/* 내 메모 (단일 모드만) */}
      {!isBatch && (
        <textarea
          placeholder="내 생각 메모 (선택) — 이 문장을 보고 든 생각"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          disabled={analyzing}
          className="w-full min-h-[72px] px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition resize-none disabled:opacity-50 disabled:bg-gray-50"
        />
      )}

      {/* 추가 맥락 */}
      <input
        type="text"
        placeholder="왜 이 문장이 중요한가? (선택)"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        disabled={analyzing}
        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition disabled:opacity-50 disabled:bg-gray-50"
      />
      <input
        type="text"
        placeholder="내 사업과 어떻게 연결되는가? (선택)"
        value={businessConnection}
        onChange={(e) => setBusinessConnection(e.target.value)}
        disabled={analyzing}
        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition disabled:opacity-50 disabled:bg-gray-50"
      />

      {/* 목적 선택 */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">독서 목적</p>
        <div className="flex gap-2 flex-wrap">
          {PURPOSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPurposeType(opt.value)}
              disabled={analyzing}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
                purposeType === opt.value
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {analyzeError && (
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            analyzeError.kind === 'network'
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : analyzeError.kind === 'input'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <p className="font-semibold mb-0.5">
            {analyzeError.kind === 'network' && '🌐 네트워크 오류'}
            {analyzeError.kind === 'server' && '⚠️ 서버 오류'}
            {analyzeError.kind === 'input' && '📝 입력 오류'}
          </p>
          <p>{analyzeError.message}</p>
        </div>
      )}

      {/* AI 분석 버튼 */}
      {!result && (
        <button
          onClick={handleAnalyze}
          disabled={!content.trim() || analyzing}
          className="w-full h-12 bg-black text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-gray-900 transition-colors"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              AI 분석 중...
            </span>
          ) : (
            `⚡ AI 분석하기${content.split('\n').filter(l => l.trim()).length > 1 ? ` (${Math.min(content.split('\n').filter(l => l.trim()).length, 10)}개)` : ''}`
          )}
        </button>
      )}

      {/* 결과 */}
      {result && !isBatch && (
        <div className="space-y-4">
          <AIResultCard result={result as AnalyzeOutput} />
          <div className="flex gap-2">
            <button
              onClick={() => { setResult(null); setAnalyzeError(null) }}
              disabled={saving}
              className="flex-1 h-12 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              다시 분석
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] h-12 bg-black text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-gray-900 transition-colors"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  저장 중...
                </span>
              ) : (
                '저장하고 실행 만들기 →'
              )}
            </button>
          </div>
        </div>
      )}

      {result && isBatch && (
        <div className="space-y-4">
          <BatchResultCard result={result as BatchAnalyzeOutput} />
          <div className="flex gap-2">
            <button
              onClick={() => { setResult(null); setAnalyzeError(null) }}
              className="flex-1 h-12 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-400 transition-colors"
            >
              다시 분석
            </button>
            <button
              onClick={() => router.push('/library')}
              className="flex-[2] h-12 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-900 transition-colors"
            >
              {`✓ ${(result as BatchAnalyzeOutput).items.length}개 저장됨 — 라이브러리 보기`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}