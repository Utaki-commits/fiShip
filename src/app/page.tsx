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
      minHeight: '100vh', background: '#0A3D62',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: '64px', height: '64px', background: '#D4AC0D', borderRadius: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
      }}>⚓</div>
      <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>遊漁船予約システム</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>読み込み中...</div>
    </main>
  )
}
