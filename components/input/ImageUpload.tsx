// components/input/ImageUpload.tsx
'use client'

import { useState, useRef } from 'react'

interface Props {
  onExtracted: (highlights: string[]) => void
}

export default function ImageUpload({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다')
      return
    }

    setLoading(true)
    setError('')

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    try {
      const res = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })

      if (!res.ok) {
        setError('OCR 처리에 실패했습니다')
        return
      }

      const data = await res.json() as { highlights: string[]; reason: string | null }

      if (!data.highlights || data.highlights.length === 0) {
        const reasonMsg =
          data.reason === '강조 표시 없음'
            ? '형광펜/밑줄이 표시된 페이지를 업로드해주세요.'
            : data.reason === '이미지 품질 문제'
            ? '이미지가 너무 어둡거나 흐립니다. 더 선명한 사진을 업로드해주세요.'
            : '강조된 문장을 찾지 못했습니다. 다시 시도해주세요.'
        setError(reasonMsg)
        return
      }

      onExtracted(data.highlights)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full h-11 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            OCR 분석 중...
          </span>
        ) : (
          '📷 책 페이지 사진 업로드 (형광펜/밑줄 자동 추출)'
        )}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}