'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <main style={{
      minHeight:'100vh',background:'#0A3D62',
      display:'flex',alignItems:'center',justifyContent:'center'
    }}>
      <div style={{color:'#fff',fontSize:'16px'}}>読み込み中...</div>
    </main>
  )

  return (
    <main style={{
      minHeight:'100vh',background:'#F8F9FA',
      fontFamily:'sans-serif'
    }}>
      <div style={{
        background:'#0A3D62',padding:'14px 16px',
        display:'flex',alignItems:'center',gap:'10px'
      }}>
        <div style={{
          width:'36px',height:'36px',background:'#D4AC0D',
          borderRadius:'8px',display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:'18px'
        }}>⚓</div>
        <div style={{flex:1,color:'#fff',fontSize:'14px',fontWeight:'700'}}>
          管理画面
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding:'6px 14px',fontSize:'12px',fontWeight:'700',
            background:'rgba(255,255,255,0.15)',color:'#fff',
            border:'1px solid rgba(255,255,255,0.3)',borderRadius:'6px',
            cursor:'pointer',fontFamily:'inherit'
          }}
        >
          ログアウト
        </button>
      </div>
      <div style={{padding:'24px 16px',textAlign:'center'}}>
        <div style={{fontSize:'40px',marginBottom:'12px'}}>🎣</div>
        <div style={{fontSize:'18px',fontWeight:'700',color:'#111827',marginBottom:'6px'}}>
          ログイン成功しました
        </div>
        <div style={{fontSize:'13px',color:'#9CA3AF'}}>
          ダッシュボードを準備中です
        </div>
      </div>
    </main>
  )
}
