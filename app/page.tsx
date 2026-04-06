'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function Page() {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        router.replace('/home')
      } else {
        router.replace('/login')
      }
    }

    checkUser()
  }, [])

  return <div>Loading...</div>
}
