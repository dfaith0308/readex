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
    summary: typeof raw.summary === 'string' ? raw.summary : FALLBACK_OUTPUT.summary,
    core_concept: typeof raw.core_concept === 'string' ? raw.core_concept : '',
    why_important: typeof raw.why_important === 'string' ? raw.why_important : '',
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

  const industryContext: Record<string, string> = {
    '스타트업': 'Focus on growth loops, early adopters, and product-market fit. Avoid anything that requires large budgets.',
    '자영업': 'Focus on foot traffic, repeat customers, local visibility, and daily revenue. Offline execution is key.',
    '대기업': 'Focus on cross-team execution, internal alignment, and scalable systems.',
    '중소기업': 'Focus on operational efficiency, B2B relationships, and cost-effective growth.',
    '프리랜서': 'Focus on client acquisition, rate optimization, and personal brand differentiation.',
  }

  const jobContext: Record<string, string> = {
    '대표/CEO': 'This user makes final decisions. Focus on revenue, customer retention, and strategic moves.',
    '기획자': 'This user executes plans. Focus on project outcomes, stakeholder alignment, and measurable results.',
    '마케터': 'This user drives demand. Focus on channel-specific tactics, conversion, and CAC reduction.',
    '영업': 'This user closes deals. Focus on pipeline, objection handling, and win rate improvement.',
    '개발자': 'This user builds products. Focus on shipping speed, user feedback loops, and technical debt trade-offs.',
  }

  const industryHint = industryContext[profile.industry || ''] || 'Tailor advice to their specific business context.'
  const jobHint = jobContext[profile.job_type || ''] || 'Tailor advice to their specific role and responsibilities.'

  const systemPrompt = `You are NOT an AI assistant.
You are a ruthless business execution consultant.
Your job is to take a highlighted sentence and turn it into a highly specific, personalized execution plan for THIS user only.

User industry context: ${industryHint}
User role context: ${jobHint}

You MUST:
- Aggressively use the user's industry, job type, and goal in every single output
- Tie every idea directly to the user's real-world situation
- Focus only on what the user can ACTUALLY execute within days
- Provide tactical, step-by-step actions with timelines
- Assume the user is a business owner or operator who needs results, not theory
- If industry is offline/food/retail: prioritize customer flow, repeat visits, offline tactics
- If job is owner/CEO: prioritize revenue, customer retention, team execution
- If goal includes sales/revenue: every action must connect to revenue impact

You MUST NOT:
- Give general advice that applies to any business
- Use vague phrases like "improve marketing", "understand your customers", "build a brand"
- Output theory without a concrete execution method
- Write anything that could apply to a random different user

CRITICAL RULE:
If your answer can be used by another random user without changes, it is WRONG.
Every sentence must feel like: "This was written specifically for ME."

You output JSON only. No markdown, no explanation, no text outside the JSON object.
Write all values in Korean.

Output this exact JSON structure:
{
  "summary": "이 사용자의 업종/목표 기준으로 재해석한 핵심 (30자 이내, 일반 요약 절대 금지)",
  "core_concept": "이 문장이 이 사용자의 업종에서 구체적으로 의미하는 것 (60자 이내)",
  "why_important": "이 사용자의 현재 목표와 직접 연결해서 왜 지금 중요한지 (80자 이내)",
  "application": "이 사용자가 지금 당장 적용할 수 있는 구체적 방법 — 업종/직무/목표 기반, 추상 표현 절대 금지 (150자 이내)",
  "tags": ["태그1", "태그2", "태그3"],
  "actions": {
    "today": "오늘 안에 실행 가능한 행동 1개 — 동사로 시작, 구체적 방법 포함, 측정 가능한 결과 포함",
    "week": [
      "3일 내: [구체적 행동] → 기대 효과: [측정 가능한 결과]",
      "이번 주: [구체적 행동] → 기대 효과: [측정 가능한 결과]",
      "이번 주: [구체적 행동] → 기대 효과: [측정 가능한 결과]"
    ],
    "idea": "이 사용자의 업종과 목표에 맞춘 실행 아이디어 — 무엇을 / 어떻게 / 왜 지금인지 포함, 일반론 금지",
    "questions": [
      "실행 점검 질문 — 이 사용자의 목표와 직결, 수치로 답할 수 있어야 함 (물음표로 끝낼 것)",
      "실행 점검 질문 — 이 사용자의 목표와 직결, 수치로 답할 수 있어야 함 (물음표로 끝낼 것)"
    ]
  }
}

tags는 다음 목록에서만 선택해라:
전략, 성장, 마케팅, 영업, 브랜딩, 고객관리, 제품, 운영, 조직, 재무, 마인드셋, 습관, 의사결정, 협상`

  const userPrompt = `User context:
- Industry: ${profile.industry || '미설정'} → ${industryHint}
- Job type: ${profile.job_type || '미설정'} → ${jobHint}
- Goal: ${profile.goal || '미설정'}
- Reading purpose: ${purposeLabel[purposeType] || '사업/창업'}
${memo ? `- User's own note on this sentence: "${memo}"` : ''}
${bookTitle ? `- Source: "${bookTitle}"${author ? ` by ${author}` : ''}` : ''}

Highlighted sentence:
"${highlight}"

TASK:
Convert this sentence into a business execution plan ONLY for this specific user.
Every output must be tailored to their industry (${profile.industry || '미설정'}) and goal (${profile.goal || '미설정'}).
If it sounds like general advice → rewrite it to be specific.
Generic advice = failure.
Specific, actionable, personalized = success.`

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

  const industryContext: Record<string, string> = {
    '스타트업': 'Focus on growth loops, early adopters, and product-market fit.',
    '자영업': 'Focus on foot traffic, repeat customers, local visibility, and daily revenue.',
    '대기업': 'Focus on cross-team execution, internal alignment, and scalable systems.',
    '중소기업': 'Focus on operational efficiency, B2B relationships, and cost-effective growth.',
    '프리랜서': 'Focus on client acquisition, rate optimization, and personal brand differentiation.',
  }

  const jobContext: Record<string, string> = {
    '대표/CEO': 'Focus on revenue, customer retention, and strategic moves.',
    '기획자': 'Focus on project outcomes, stakeholder alignment, and measurable results.',
    '마케터': 'Focus on channel-specific tactics, conversion, and CAC reduction.',
    '영업': 'Focus on pipeline, objection handling, and win rate improvement.',
    '개발자': 'Focus on shipping speed, user feedback loops, and technical debt trade-offs.',
  }

  const industryHint = industryContext[profile.industry || ''] || 'Tailor advice to their specific business context.'
  const jobHint = jobContext[profile.job_type || ''] || 'Tailor advice to their specific role.'

  const systemPrompt = `You are a ruthless business execution consultant.
Your job is to analyze multiple highlighted sentences and produce a personalized execution plan for THIS user only.

User industry context: ${industryHint}
User role context: ${jobHint}

You MUST:
- Tie every idea to the user's industry (${profile.industry || '미설정'}) and goal (${profile.goal || '미설정'})
- Produce specific, actionable outputs — no theory
- Generate both individual analysis AND a unified group strategy

You output JSON only. No markdown. Write all values in Korean.

Output this exact JSON structure:
{
  "items": [
    {
      "highlight": "원문 그대로",
      "summary": "이 사용자 기준 재해석 (20자 이내)",
      "core_concept": "이 사용자 업종에서 의미하는 것 (50자 이내)",
      "why_important": "이 사용자 목표와 연결한 이유 (60자 이내)",
      "application": "이 사용자가 지금 당장 적용할 방법 (100자 이내, 추상 표현 금지)",
      "tags": ["태그1", "태그2"],
      "actions": {
        "today": "오늘 실행 1개 — 동사로 시작, 구체적",
        "week": ["3일 내 과제 → 기대 효과", "이번 주 과제 → 기대 효과", "이번 주 과제 → 기대 효과"],
        "idea": "이 사용자 업종/목표 맞춤 아이디어",
        "questions": ["수치로 답할 수 있는 실행 점검 질문1?", "수치로 답할 수 있는 실행 점검 질문2?"]
      }
    }
  ],
  "group_insight": {
    "summary": "전체 하이라이트를 이 사용자 기준으로 관통하는 핵심 통찰 1문장",
    "strategy": "이 사용자가 지금 당장 취해야 할 구체적 전략 방향 (일반론 금지)",
    "opportunity": "이 하이라이트들에서 이 사용자에게만 해당하는 사업 기회"
  }
}

tags는 다음 목록에서만 선택해라:
전략, 성장, 마케팅, 영업, 브랜딩, 고객관리, 제품, 운영, 조직, 재무, 마인드셋, 습관, 의사결정, 협상`

  const userPrompt = `User context:
- Industry: ${profile.industry || '미설정'} → ${industryHint}
- Job type: ${profile.job_type || '미설정'} → ${jobHint}
- Goal: ${profile.goal || '미설정'}
- Reading purpose: ${purposeLabel[purposeType] || '사업/창업'}
${context ? `- Additional context: "${context}"` : ''}
${business_connection ? `- Business connection: "${business_connection}"` : ''}

Highlighted sentences:
${highlights.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

TASK:
Analyze all sentences and generate individual + group execution output for THIS specific user.
Every output must reflect their industry and goal. Generic = failure.`

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
    console.error('[analyzeBatch][ERROR]', {
      message: err instanceof Error ? err.message : String(err),
      userId: profile.industry,
    })
    throw err
  }

  const fixed = fixTruncatedJSON(rawText)
  const extracted = extractJSON(fixed)
  const parsed = JSON.parse(extracted) as BatchAnalyzeOutput
  return parsed
}
