// app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { title: string; author?: string }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: '책 제목이 필요합니다' }, { status: 400 })
  }

  // Google Books API로 표지 자동 조회
  let cover_url: string | null = null
  try {
    const query = encodeURIComponent(`${body.title} ${body.author ?? ''}`.trim())
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`)
    const json = await res.json() as {
      items?: { volumeInfo?: { imageLinks?: { thumbnail?: string } } }[]
    }
    cover_url = json.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ?? null
    if (cover_url) {
      cover_url = cover_url.replace('http://', 'https://')
    }
  } catch {
    cover_url = null
  }

  const { data, error } = await supabase
    .from('books')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      author: body.author?.trim() ?? null,
      cover_url,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}