'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main style={{
      minHeight:'100vh',background:'#0A3D62',
      display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'
    }}>
      <div style={{
        background:'#fff',borderRadius:'16px',padding:'32px 24px',
        width:'100%',maxWidth:'400px'
      }}>
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <div style={{
            width:'56px',height:'56px',background:'#D4AC0D',borderRadius:'14px',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'28px',margin:'0 auto 12px'
          }}>⚓</div>
          <div style={{fontSize:'20px',fontWeight:'700',color:'#111827'}}>
            遊漁船予約システム
          </div>
          <div style={{fontSize:'13px',color:'#9CA3AF',marginTop:'4px'}}>
            船長ログイン
          </div>
        </div>

        {error && (
          <div style={{
            background:'#FEE2E2',border:'1px solid #FCA5A5',borderRadius:'8px',
            padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#B91C1C'
          }}>
            {error}
          </div>
        )}

        <div style={{marginBottom:'14px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#6B7280',marginBottom:'6px'}}>
            メールアドレス
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="例：yamada@example.com"
            style={{
              width:'100%',padding:'14px',fontSize:'15px',
              border:'2px solid #E5E7EB',borderRadius:'10px',
              outline:'none',fontFamily:'inherit'
            }}
          />
        </div>

        <div style={{marginBottom:'24px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#6B7280',marginBottom:'6px'}}>
            パスワード
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            style={{
              width:'100%',padding:'14px',fontSize:'15px',
              border:'2px solid #E5E7EB',borderRadius:'10px',
              outline:'none',fontFamily:'inherit'
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width:'100%',padding:'16px',fontSize:'16px',fontWeight:'700',
            background: loading ? '#E5E7EB' : '#0A3D62',
            color: loading ? '#9CA3AF' : '#fff',
            border:'none',borderRadius:'12px',cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily:'inherit'
          }}
        >
          {loading ? 'ログイン中...' : 'ログインする'}
        </button>
      </div>
    </main>
  )
}
