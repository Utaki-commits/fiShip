'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    setBusy(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError('ログインできませんでした。メールアドレスとパスワードを確認してください。')
      setBusy(false)
      return
    }

    router.replace('/dashboard')
  }

  const handleLineLogin = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError('LINEログインは現在準備中です。開発用ログインをご利用ください。')
    }
  }

  const buttonBase = {
    width: '100%',
    minHeight: '64px',
    borderRadius: '12px',
    fontFamily: 'inherit',
    fontSize: '20px',
    fontWeight: 700,
    cursor: busy ? 'not-allowed' : 'pointer',
  }

  const inputStyle = {
    width: '100%',
    minHeight: '60px',
    borderRadius: '10px',
    border: '2px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--fg-1)',
    fontSize: '18px',
    fontFamily: 'inherit',
    padding: '16px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'var(--font-sans)',
    }}>
      <section style={{
        width: '100%',
        maxWidth: '480px',
        minHeight: 'calc(100vh - 48px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px 20px 28px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 18px' }}>
              <img src={DEFAULT_ICON} alt="fiShip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ margin: 0, color: 'var(--fg-1)', fontSize: '28px', fontWeight: 700, lineHeight: 1.3 }}>
              開発用ログイン
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--fg-2)', fontSize: '15px', lineHeight: 1.7 }}>
              Supabase Email認証でログインします
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--status-full-bg)',
              border: '2px solid var(--status-full-bd)',
              borderRadius: '12px',
              color: 'var(--status-full-fg)',
              fontSize: '16px',
              fontWeight: 700,
              lineHeight: 1.6,
              padding: '14px 16px',
              marginBottom: '18px',
            }}>
              {error}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '8px' }}>
            メールアドレス
          </label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="captain@example.com"
            style={{ ...inputStyle, marginBottom: '14px' }}
          />

          <label style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '8px' }}>
            パスワード
          </label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="パスワード"
            style={{ ...inputStyle, marginBottom: '18px' }}
          />

          <button
            type="button"
            onClick={handleLogin}
            disabled={busy}
            style={{
              ...buttonBase,
              background: busy ? 'var(--border)' : 'var(--ocean)',
              color: busy ? 'var(--fg-3)' : '#fff',
              border: 'none',
              marginBottom: '12px',
            }}
          >
            {busy ? 'ログイン中...' : 'ログインする'}
          </button>

          <button
            type="button"
            onClick={handleLineLogin}
            disabled
            style={{
              ...buttonBase,
              background: 'var(--status-closed-bg)',
              color: 'var(--fg-3)',
              border: '1px solid var(--border)',
              cursor: 'not-allowed',
            }}
          >
            LINEログイン（準備中）
          </button>

          <p style={{ fontSize: '13px', color: 'var(--fg-2)', textAlign: 'center', marginTop: '16px', lineHeight: 1.8 }}>
            本番用のLINEログイン・電話番号認証は別タスクで追加します。
          </p>
        </div>
      </section>
    </main>
  )
}
