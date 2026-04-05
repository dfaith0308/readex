// lib/ai.ts
import OpenAI from 'openai'
import { AnalyzeInput, AnalyzeOutput, AnalyzeActions, BatchAnalyzeInput, BatchAnalyzeOutput } from '@/types'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const FALLBACK_OUTPUT: AnalyzeOutput = {
  summary: 'AI 응답 파싱 실패',
  core_concept: '',
  why_important: '',
  application: '',
  tags: ['전략'],
  actions: {
    today: '하이라이트를 다시 분석 시도',
    week: [],
    idea: '',
    questions: [],
  },
}

function fixTruncatedJSON(text: string): string {
  const openCount = (text.match(/{/g) || []).length
  const closeCount = (text.match(/}/g) || []).length

  if (openCount > closeCount) {
    return text + '}'.repeat(openCount - closeCount)
  }

  return text
}

function extractJSON(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error('No JSON found in response')
  }

  return text.slice(start, end + 1)
}

function isValidAnalyzeOutput(value: unknown): value is AnalyzeOutput {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  if (typeof v.summary !== 'string') return false
  if (typeof v.core_concept !== 'string') return false
  if (typeof v.why_important !== 'string') return false
  if (typeof v.application !== 'string') return false
  if (!Array.isArray(v.tags)) return false
  if (!v.actions || typeof v.actions !== 'object') return false

  const actions = v.actions as Record<string, unknown>
  if (typeof actions.today !== 'string') return false
  if (!Array.isArray(actions.week)) return false
  if (typeof actions.idea !== 'string') return false
  if (!Array.isArray(actions.questions)) return false

  return true
}

function sanitizeOutput(raw: Record<string, unknown>): AnalyzeOutput {
  const actions =
    raw.actions && typeof raw.actions === 'object'
      ? (raw.actions as Record<string, unknown>)
      : {}

  const sanitizedActions: AnalyzeActions = {
    today:
      typeof actions.today === 'string'
        ? actions.today
        : FALLBACK_OUTPUT.actions.today,
    week: Array.isArray(actions.week)
      ? (actions.week as unknown[]).filter((w): w is string => typeof w === 'string')
      : [],
    idea: typeof actions.idea === 'string' ? actions.idea : '',
    questions: Array.isArray(actions.questions)
      ? (actions.questions as unknown[]).filter((q): q is string => typeof q === 'string')
      : [],
  }

  return {
    summary:
      typeof raw.summary === 'string' ? raw.summary : FALLBACK_OUTPUT.summary,
    core_concept: typeof raw.core_concept === 'string' ? raw.core_concept : '',
    why_important:
      typeof raw.why_important === 'string' ? raw.why_important : '',
    application: typeof raw.application === 'string' ? raw.application : '',
    tags: Array.isArray(raw.tags)
      ? (raw.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      : ['전략'],
    actions: sanitizedActions,
  }
}

function parseAIResponse(rawText: string): AnalyzeOutput {
  console.error('[RAW_AI_RESPONSE]', rawText)

  let parsed: unknown
  try {
    const fixed = fixTruncatedJSON(rawText)
    const extracted = extractJSON(fixed)
    parsed = JSON.parse(extracted)
  } catch (e) {
    console.error('[AI_PARSE_ERROR]', e)
    console.error('[AI_PARSE_ERROR] raw text was:', rawText)
    return { ...FALLBACK_OUTPUT }
  }

  if (isValidAnalyzeOutput(parsed)) {
    return parsed
  }

  console.error('[Invalid response] Structure validation failed. Parsed:', parsed)

  if (parsed && typeof parsed === 'object') {
    return sanitizeOutput(parsed as Record<string, unknown>)
  }

  return { ...FALLBACK_OUTPUT }
}

export async function analyzeHighlight(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const { bookTitle, author, highlight, memo, purposeType, profile } = input

  const purposeLabel: Record<string, string> = {
    business: '사업/창업',
    work: '직장/실무',
    life: '삶/자기계발',
    content: '콘텐츠 창작',
  }

  const systemPrompt = `너는 JSON만 출력하는 분석 엔진이다. 텍스트, 설명, 마크다운 일절 금지.
독서 하이라이트를 받으면 아래 JSON 구조로만 응답해라. 한국어로 작성해라.

출력 규칙:
- 사업가/창업가 기준: 수익/고객/성장 관점
- 실무자 기준: 업무/효율/성과 관점
- 추상적 조언 금지, 오늘 당장 실행 가능한 언어만 사용
- tags는 반드시 아래 목록에서만 선택: 전략, 성장, 마케팅, 영업, 브랜딩, 고객관리, 제품, 운영, 조직, 재무, 마인드셋, 습관, 의사결정, 협상

응답 형식 (이 구조 그대로, 키 이름 변경 금지):
{
  "summary": "20자 이내 핵심 요약, 명사형",
  "core_concept": "50자 이내 핵심 개념",
  "why_important": "60자 이내 중요한 이유, 구체적으로",
  "application": "100자 이내 사용자 상황 맞춤 적용 해석",
  "tags": ["태그1", "태그2", "태그3"],
  "actions": {
    "today": "동사로 시작하는 오늘 실행 1개",
    "week": ["동사로 시작 과제1", "동사로 시작 과제2", "동사로 시작 과제3"],
    "idea": "날카로운 사업/제품 아이디어 1개",
    "questions": ["물음표로 끝나는 질문1?", "물음표로 끝나는 질문2?"]
  }
}`

  const userPrompt = `책 제목: ${bookTitle || '미입력'}
저자: ${author || '미상'}
하이라이트: "${highlight}"
내 메모: ${memo || '없음'}
독서 목적: ${purposeLabel[purposeType] || '사업/창업'}
사용자 업종: ${profile.industry || '미설정'}
사용자 직무: ${profile.job_type || '미설정'}
사용자 목표: ${profile.goal || '미설정'}`

  const timeoutMs = 15000

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs)
  )

const requestPromise = client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  let rawText: string
  try {
    const response = await Promise.race([requestPromise, timeoutPromise])

    console.error('[FULL_AI_RESPONSE]', response.choices)

    const text = response.choices[0]?.message?.content ?? ''

    rawText = text.trim()
  } catch (err) {
      if (err instanceof Error && err.message === 'AI_TIMEOUT') {
        console.error('[AI analyze error] Request timed out after', timeoutMs, 'ms')
      } else {
        console.error('[AI analyze error] Full error object:', JSON.stringify(err, null, 2))
        console.error('[AI analyze error] Error message:', err instanceof Error ? err.message : err)
        console.error('[AI analyze error] Error stack:', err instanceof Error ? err.stack : 'no stack')
      }
      return { ...FALLBACK_OUTPUT }
    }

  if (!rawText || rawText.length === 0) {
    console.error('[AI analyze error] Empty response from API')
    return { ...FALLBACK_OUTPUT }
  }

  return parseAIResponse(rawText)
}

export async function analyzeBatch(input: BatchAnalyzeInput): Promise<BatchAnalyzeOutput> {
  const { highlights, purposeType, context, business_connection, profile } = input

  const purposeLabel: Record<string, string> = {
    business: '사업/창업',
    work: '직장/실무',
    life: '삶/자기계발',
    content: '콘텐츠 창작',
  }

  const systemPrompt = `너는 JSON만 출력하는 전략 분석 엔진이다. 텍스트, 설명, 마크다운 일절 금지.
여러 독서 하이라이트를 받으면 개별 분석 + 그룹 전략 인사이트를 생성한다.

출력 규칙:
- 단순 요약 금지
- 실행 / 전략 / 기회 중심 출력
- 사업가/창업가 기준: 수익/고객/성장 관점
- 추상적 조언 금지
- tags는 다음 목록에서만 선택: 전략, 성장, 마케팅, 영업, 브랜딩, 고객관리, 제품, 운영, 조직, 재무, 마인드셋, 습관, 의사결정, 협상

응답 형식 (키 이름 변경 금지):
{
  "items": [
    {
      "highlight": "원문 그대로",
      "summary": "20자 이내 명사형",
      "core_concept": "50자 이내",
      "why_important": "60자 이내 구체적으로",
      "application": "100자 이내 사용자 상황 맞춤",
      "tags": ["태그1", "태그2"],
      "actions": {
        "today": "동사로 시작 오늘 실행 1개",
        "week": ["과제1", "과제2", "과제3"],
        "idea": "날카로운 아이디어 1개",
        "questions": ["질문1?", "질문2?"]
      }
    }
  ],
  "group_insight": {
    "summary": "전체 하이라이트를 관통하는 핵심 통찰 1문장",
    "strategy": "이 사용자가 지금 당장 취해야 할 전략 방향",
    "opportunity": "이 하이라이트들에서 발견되는 사업 기회"
  }
}`

  const userPrompt = `하이라이트 목록:
${highlights.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

독서 목적: ${purposeLabel[purposeType] || '사업/창업'}
사용자 업종: ${profile.industry || '미설정'}
사용자 직무: ${profile.job_type || '미설정'}
사용자 목표: ${profile.goal || '미설정'}
${context ? `추가 맥락: ${context}` : ''}
${business_connection ? `사업 연결: ${business_connection}` : ''}`

  const timeoutMs = 30000
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs)
  )

  const requestPromise = client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  let rawText: string
  try {
    const response = await Promise.race([requestPromise, timeoutPromise])
    rawText = response.choices[0]?.message?.content ?? ''
  } catch (err) {
    console.error('[analyzeBatch error]', err)
    throw err
  }

  const fixed = fixTruncatedJSON(rawText)
  const extracted = extractJSON(fixed)
  const parsed = JSON.parse(extracted) as BatchAnalyzeOutput
  return parsed
}