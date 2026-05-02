'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'setup'

// 管理者メールアドレスリストを取得（カンマ区切りで複数設定可能）
const getAdminEmails = (): string[] => {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
  return raw.split(',').map(e => e.trim()).filter(Boolean)
}

export default function AdminLoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [setupDone, setSetupDone] = useState(false)
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

    // 管理者メールアドレスリストと照合する
    const adminEmails = getAdminEmails()
    if (adminEmails.length > 0 && !adminEmails.includes(data.user.email || '')) {
      await supabase.auth.signOut()
      setError('このアカウントには管理者権限がありません')
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  // 管理者アカウントを新規作成する（サービスロールAPIを使用）
  const handleSetup = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    if (password !== confirmPassword) { setError('パスワードが一致しません'); return }
    if (password.length < 8) { setError('パスワードは8文字以上で入力してください'); return }

    const adminEmails = getAdminEmails()
    if (adminEmails.length > 0 && !adminEmails.includes(email.trim())) {
      setError('このメールアドレスは管理者として登録できません。\nADMIN_EMAILSで許可されたアドレスを入力してください')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'アカウントの作成に失敗しました')
        return
      }
      setSetupDone(true)
      setMode('login')
      setPassword('')
      setConfirmPassword('')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', background: '#374151', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 14px',
          }}>🛡️</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB' }}>fiShip 運営管理</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>
            {mode === 'login' ? '管理者ログイン' : '管理者アカウントを作成'}
          </div>
        </div>

        {/* セットアップ完了バナー */}
        {setupDone && (
          <div style={{
            background: '#064E3B', border: '1px solid #34D399', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#6EE7B7',
          }}>
            アカウントを作成しました。ログインしてください。
          </div>
        )}

        {/* エラー */}
        {error && (
          <div style={{
            background: '#7F1D1D', border: '1px solid #EF4444', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#FCA5A5',
            whiteSpace: 'pre-line',
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
            onKeyDown={e => mode === 'login' && e.key === 'Enter' && handleLogin()}
            placeholder="admin@example.com"
            style={{
              width: '100%', padding: '14px', fontSize: '15px',
              background: '#374151', border: '1px solid #4B5563', borderRadius: '10px',
              outline: 'none', fontFamily: 'inherit', color: '#F9FAFB', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* パスワード */}
        <div style={{ marginBottom: mode === 'setup' ? '14px' : '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
            パスワード
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => mode === 'login' && e.key === 'Enter' && handleLogin()}
            placeholder={mode === 'setup' ? '8文字以上で入力' : 'パスワードを入力'}
            style={{
              width: '100%', padding: '14px', fontSize: '15px',
              background: '#374151', border: '1px solid #4B5563', borderRadius: '10px',
              outline: 'none', fontFamily: 'inherit', color: '#F9FAFB', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* パスワード確認（セットアップ時のみ） */}
        {mode === 'setup' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
              パスワード（確認）
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力"
              style={{
                width: '100%', padding: '14px', fontSize: '15px',
                background: '#374151', border: '1px solid #4B5563', borderRadius: '10px',
                outline: 'none', fontFamily: 'inherit', color: '#F9FAFB', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* メインボタン */}
        <button
          onClick={mode === 'login' ? handleLogin : handleSetup}
          disabled={loading}
          style={{
            width: '100%', padding: '16px', fontSize: '15px', fontWeight: 700,
            background: loading ? '#374151' : '#3B82F6',
            color: loading ? '#6B7280' : '#fff',
            border: 'none', borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {loading
            ? (mode === 'login' ? 'ログイン中...' : '作成中...')
            : (mode === 'login' ? 'ログインする' : 'アカウントを作成する')}
        </button>

        {/* モード切り替えリンク */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          {mode === 'login' ? (
            <button
              onClick={() => { setMode('setup'); setError(''); setPassword('') }}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
            >
              初回セットアップ（管理者アカウントの作成）
            </button>
          ) : (
            <button
              onClick={() => { setMode('login'); setError(''); setPassword(''); setConfirmPassword('') }}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
            >
              ← ログインに戻る
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
