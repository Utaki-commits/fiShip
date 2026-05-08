'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
    redirect()
  }, [router])

  // リダイレクト中のスプラッシュ画面
  return (
    <main style={{
      minHeight: '100vh', background: 'var(--ocean)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '64px', height: '64px', background: 'var(--gold)', borderRadius: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
      }}>⚓</div>
      <div style={{ color: 'var(--surface)', fontSize: '28px', fontWeight: 700 }}>遊漁船予約システム</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>読み込み中...</div>
    </main>
  )
}

