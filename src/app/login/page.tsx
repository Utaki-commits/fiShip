'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

const colors = {
  bg: '#F4F6F2',
  card: '#FFFFFF',
  border: '#CDD3DC',
  text: '#1A2420',
  sub: '#5A6A78',
  action: '#1E4D3A',
  errorBg: '#FEE2E2',
  errorText: '#B91C1C',
  errorBorder: '#FCA5A5',
}

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

  const inputStyle = {
    width: '100%',
    minHeight: '56px',
    borderRadius: '8px',
    border: `0.5px solid ${colors.border}`,
    background: colors.card,
    color: colors.text,
    fontSize: '16px',
    fontFamily: 'inherit',
    padding: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <main style={{ minHeight: '100vh', background: colors.bg, display: 'flex', justifyContent: 'center', padding: '24px 16px', fontFamily: 'var(--font-sans)' }}>
      <section style={{ width: '100%', maxWidth: '480px', minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ background: colors.card, border: `0.5px solid ${colors.border}`, borderRadius: '12px', padding: '32px 20px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 18px' }}>
              <img src={DEFAULT_ICON} alt="fiShip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h1 style={{ margin: 0, color: colors.text, fontSize: '19px', fontWeight: 500, lineHeight: 1.4 }}>
              開発用ログイン
            </h1>
            <p style={{ margin: '8px 0 0', color: colors.sub, fontSize: '14px', lineHeight: 1.7 }}>
              メールアドレスとパスワードでログインします。
            </p>
          </div>

          {error && (
            <div style={{ background: colors.errorBg, border: `0.5px solid ${colors.errorBorder}`, borderRadius: '8px', color: colors.errorText, fontSize: '14px', fontWeight: 500, lineHeight: 1.6, padding: '12px 16px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.text, marginBottom: '8px' }}>
            メールアドレス
          </label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="captain@example.com" style={{ ...inputStyle, marginBottom: '14px' }} />

          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: colors.text, marginBottom: '8px' }}>
            パスワード
          </label>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="パスワード" style={{ ...inputStyle, marginBottom: '18px' }} />

          <button type="button" onClick={handleLogin} disabled={busy} style={{ width: '100%', minHeight: '56px', padding: '14px', borderRadius: '9px', fontFamily: 'inherit', fontSize: '16px', fontWeight: 500, cursor: busy ? 'not-allowed' : 'pointer', background: busy ? colors.border : colors.action, color: busy ? colors.sub : '#fff', border: 'none' }}>
            {busy ? 'ログイン中...' : 'ログインする'}
          </button>

          <p style={{ fontSize: '13px', color: colors.sub, textAlign: 'center', marginTop: '16px', lineHeight: 1.8 }}>
            LINE・電話番号認証は準備中です。
          </p>
        </div>
      </section>
    </main>
  )
}
