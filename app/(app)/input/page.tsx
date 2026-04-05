// app/(app)/input/page.tsx
import HighlightForm from '@/components/input/HighlightForm'

export default function InputPage() {
  return (
    <div className="px-4 pt-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">하이라이트 입력</h1>
        <p className="text-sm text-gray-500 mt-1">책의 문장을 실행으로 바꿉니다</p>
      </div>
      <HighlightForm />
    </div>
  )
}
