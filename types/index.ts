// types/index.ts

export interface Profile {
  id: string
  name: string | null
  email: string | null
  industry: string | null
  job_type: string | null
  goal: string | null
  ai_style: string
  onboarding_done: boolean
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_url: string | null
  created_at: string
}

export interface AIAnalysis {
  id: string
  highlight_id: string
  summary: string
  core_concept: string
  why_important: string
  application: string
  tags: string[]
  created_at: string
}

export interface ActionItem {
  id: string
  highlight_id: string | null
  user_id: string
  title: string
  description: string | null
  action_type: 'today' | 'week' | 'idea' | 'question' | 'experiment'
  priority: 1 | 2 | 3
  status: 'pending' | 'done'
  due_date: string | null
  completed_at: string | null
  created_at: string
  highlight?: Highlight
  reflection?: Reflection
}

export interface Highlight {
  id: string
  user_id: string
  book_id: string | null
  content: string
  memo: string | null
  purpose_type: 'business' | 'work' | 'life' | 'content'
  is_starred: boolean
  created_at: string
  book?: Book
  ai_analysis?: AIAnalysis
  action_items?: ActionItem[]
}

export interface Reflection {
  id: string
  action_item_id: string
  user_id: string
  result_note: string | null
  usefulness_score: number | null
  created_at: string
}

export interface AnalyzeInput {
  bookTitle: string
  author?: string
  highlight: string
  memo?: string
  purposeType: string
  profile: {
    industry?: string | null
    job_type?: string | null
    goal?: string | null
  }
}

export interface AnalyzeActions {
  today: string
  week: string[]
  idea: string
  questions: string[]
}

export interface AnalyzeOutput {
  summary: string
  core_concept: string
  why_important: string
  application: string
  tags: string[]
  actions: AnalyzeActions
}

export interface BatchAnalyzeInput {
  highlights: string[]
  purposeType: string
  context?: string
  business_connection?: string
  profile: {
    industry?: string | null
    job_type?: string | null
    goal?: string | null
  }
}

export interface BatchAnalyzeItem {
  highlight: string
  summary: string
  core_concept: string
  why_important: string
  application: string
  tags: string[]
  actions: AnalyzeActions
}

export interface GroupInsight {
  summary: string
  strategy: string
  opportunity: string
}

export interface BatchAnalyzeOutput {
  items: BatchAnalyzeItem[]
  group_insight: GroupInsight
}

export type PurposeType = 'business' | 'work' | 'life' | 'content'
export type ActionType = 'today' | 'week' | 'idea' | 'question' | 'experiment'
export type ActionStatus = 'pending' | 'done'
