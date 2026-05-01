'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    // 管理者メールアドレスと照合する
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (adminEmail && data.user.email !== adminEmail) {
      await supabase.auth.signOut()
      setError('このアカウントには管理者権限がありません')
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#111827',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#1F2937', borderRadius: '16px', padding: '36px 28px',
        width: '100%', maxWidth: '400px', fontFamily: 'sans-serif',
      }}>
        {/* タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', background: '#374151', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 14px',
          }}>🛡️</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB' }}>fiShip 運営管理</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>管理者ログイン</div>
        </div>

        {/* エラー */}
        {error && (
          <div style={{
            background: '#7F1D1D', border: '1px solid #EF4444', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#FCA5A5',
          }}>
            {error}
          </div>
        )}

        {/* メールアドレス */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
            メールアドレス
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="admin@example.com"
            style={{
              width: '100%', padding: '14px', fontSize: '15px',
              background: '#374151', border: '1px solid #4B5563', borderRadius: '10px',
              outline: 'none', fontFamily: 'inherit', color: '#F9FAFB', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* パスワード */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
            パスワード
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="パスワードを入力"
            style={{
              width: '100%', padding: '14px', fontSize: '15px',
              background: '#374151', border: '1px solid #4B5563', borderRadius: '10px',
              outline: 'none', fontFamily: 'inherit', color: '#F9FAFB', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ログインボタン */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '16px', fontSize: '15px', fontWeight: 700,
            background: loading ? '#374151' : '#3B82F6',
            color: loading ? '#6B7280' : '#fff',
            border: 'none', borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {loading ? 'ログイン中...' : 'ログインする'}
        </button>
      </div>
    </main>
  )
}
