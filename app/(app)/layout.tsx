// app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import BottomNav from '@/components/layout/BottomNav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_done) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-lg mx-auto min-h-screen">{children}</main>
      <BottomNav />
    </div>
  )
}
