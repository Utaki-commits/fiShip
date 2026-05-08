'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'reset' | 'new-password'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  // パスワードリセットメールのリンクから戻ってきた場合を検出する
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new-password')
        setError('')
        setMessage('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const reset = () => { setError(''); setMessage('') }

  const switchMode = (next: Mode) => { reset(); setMode(next) }

  // ログイン
  const handleLogin = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    setLoading(true); reset()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  // 新規登録
  const handleSignup = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    if (password.length < 8) { setError('パスワードは8文字以上で入力してください'); return }
    if (password !== passwordConfirm) { setError('パスワードが一致しません'); return }
    setLoading(true); reset()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('登録に失敗しました。このメールアドレスはすでに使用されているかもしれません。')
    } else {
      setMessage('確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。')
    }
    setLoading(false)
  }

  // パスワードリセットメール送信
  const handleReset = async () => {
    if (!email) { setError('メールアドレスを入力してください'); return }
    setLoading(true); reset()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      setError('送信に失敗しました。メールアドレスを確認してください。')
    } else {
      setMessage('パスワード再設定のメールを送信しました。メールをご確認ください。')
    }
    setLoading(false)
  }

  // 新パスワード設定（PASSWORD_RECOVERYセッション中に実行）
  const handleNewPassword = async () => {
    if (!password) { setError('新しいパスワードを入力してください'); return }
    if (password.length < 8) { setError('パスワードは8文字以上で入力してください'); return }
    if (password !== passwordConfirm) { setError('パスワードが一致しません'); return }
    setLoading(true); reset()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleSubmit = () => {
    if (mode === 'login') handleLogin()
    else if (mode === 'signup') handleSignup()
    else if (mode === 'new-password') handleNewPassword()
    else handleReset()
  }

  const titles: Record<Mode, { title: string; sub: string; btn: string }> = {
    login:        { title: '船長ログイン',        sub: 'メールアドレスとパスワードでログイン',    btn: 'ログインする' },
    signup:       { title: '新規登録',            sub: '新しいアカウントを作成します',            btn: '登録する' },
    reset:        { title: 'パスワードを忘れた',  sub: '登録済みのメールアドレスを入力してください', btn: '再設定メールを送る' },
    'new-password': { title: '新しいパスワード設定', sub: '新しいパスワードを入力してください',   btn: 'パスワードを更新する' },
  }

  const { title, sub, btn } = titles[mode]

  const oceanGradient =
    'radial-gradient(120% 200% at 88% 110%, rgba(46,134,193,.45) 0%, transparent 55%),' +
    'radial-gradient(80% 120% at 12% -20%, rgba(212,172,13,.18) 0%, transparent 60%),' +
    'linear-gradient(180deg, var(--ocean) 0%, #0F4570 55%, #04192B 100%)'

  const inputStyle = {
    width: '100%',
    padding: '18px 16px',
    fontSize: '22px',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    minHeight: '64px',
    color: 'var(--fg-1)',
    background: 'var(--surface)',
  }

  const labelStyle = {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--fg-1)',
    marginBottom: '10px',
  }

  const linkButtonStyle = {
    background: 'none',
    border: 'none',
    minHeight: '56px',
    padding: '10px 12px',
    fontSize: '22px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'underline',
  }

  return (
    <main style={{
      minHeight: '100vh', background: oceanGradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      position: 'relative', overflow: 'hidden', isolation: 'isolate',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: '1px', zIndex: 2,
        background: 'linear-gradient(90deg,transparent 0%,rgba(242,199,68,.55) 30%,rgba(242,199,68,.85) 50%,rgba(242,199,68,.55) 70%,transparent 100%)',
      }} />
      <svg viewBox="0 0 700 60" preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '60px', opacity: 0.55, pointerEvents: 'none', zIndex: 1 }}>
        <path d="M0 36 Q 90 24, 180 36 T 360 36 T 540 36 T 720 36 V60 H0 Z" fill="rgba(46,134,193,.30)" />
        <path d="M0 46 Q 90 36, 180 46 T 360 46 T 540 46 T 720 46 V60 H0 Z" fill="rgba(46,134,193,.50)" />
      </svg>
      <div style={{
        background: 'var(--surface)', borderRadius: '20px', padding: '40px 28px',
        width: '100%', maxWidth: '440px', fontFamily: 'var(--font-sans)',
        position: 'relative', zIndex: 3,
        boxShadow: '0 20px 50px -20px rgba(4,25,43,.55)',
      }}>
        {/* アイコン・タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '84px', height: '84px', background: 'var(--surface)', borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', border: '2px solid var(--border)', overflow: 'hidden',
          }}>
            <span style={{ fontSize: '40px', color: 'var(--ocean)', fontWeight: 700, lineHeight: 1 }}>fi</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.25 }}>{title}</div>
          <div style={{ fontSize: '18px', color: 'var(--fg-2)', marginTop: '10px', fontWeight: 600, lineHeight: 1.6 }}>{sub}</div>
        </div>

        {/* エラー */}
        {error && (
          <div style={{
            background: 'var(--status-full-bg)', border: '2px solid var(--status-full-bd)', borderRadius: '12px',
            padding: '16px 18px', marginBottom: '22px', fontSize: '18px', color: 'var(--status-full-fg)',
            fontWeight: 700, lineHeight: 1.6,
          }}>
            {error}
          </div>
        )}

        {/* 完了メッセージ */}
        {message && (
          <div style={{
            background: 'var(--status-ok-bg)', border: '2px solid var(--status-ok-bd)', borderRadius: '12px',
            padding: '16px 18px', marginBottom: '22px', fontSize: '18px', color: 'var(--status-ok-fg)', lineHeight: 1.7,
            fontWeight: 700,
          }}>
            {message}
          </div>
        )}

        {!message && (
          <>
            {/* メールアドレス（新パスワード設定画面では非表示） */}
            {mode !== 'new-password' && (
              <div style={{ marginBottom: '22px' }}>
                <div style={labelStyle}>
                  メールアドレス
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="例：yamada@example.com"
                  style={inputStyle}
                />
              </div>
            )}

            {/* パスワード（リセット以外で表示） */}
            {mode !== 'reset' && (
              <div style={{ marginBottom: (mode === 'signup' || mode === 'new-password') ? '22px' : '28px' }}>
                <div style={labelStyle}>
                  {mode === 'new-password' ? '新しいパスワード（8文字以上）' : `パスワード${mode === 'signup' ? '（8文字以上）' : ''}`}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={mode === 'signup' || mode === 'new-password' ? '8文字以上で入力' : 'パスワードを入力'}
                  style={inputStyle}
                />
              </div>
            )}

            {/* パスワード確認（新規登録・新パスワード設定で表示） */}
            {(mode === 'signup' || mode === 'new-password') && (
              <div style={{ marginBottom: '28px' }}>
                <div style={labelStyle}>
                  パスワード（確認）
                </div>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="もう一度入力"
                  style={inputStyle}
                />
              </div>
            )}

            {mode === 'reset' && <div style={{ marginBottom: '28px' }} />}

            {/* メインボタン */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '20px 26px', fontSize: '24px', fontWeight: 600,
                background: loading ? 'var(--border)' : 'linear-gradient(180deg,var(--ocean) 0%,#164B73 100%)',
                color: loading ? 'var(--fg-3)' : 'var(--surface)',
                border: 'none', borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                minHeight: '64px',
                boxShadow: loading ? 'none' : 'inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 rgba(0,0,0,.18), 0 4px 12px rgba(15,69,112,.30)',
              }}
            >
              {loading ? '処理中...' : btn}
            </button>
          </>
        )}

        {/* モード切り替えリンク */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          {mode === 'login' && (
            <>
              <button
                onClick={() => switchMode('reset')}
                style={{ ...linkButtonStyle, color: 'var(--fg-2)' }}
              >
                パスワードを忘れた方はこちら
              </button>
              <button
                onClick={() => switchMode('signup')}
                style={{ ...linkButtonStyle, color: 'var(--ocean)', fontWeight: 700 }}
              >
                新規登録はこちら →
              </button>
            </>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <button
              onClick={() => switchMode('login')}
              style={{ ...linkButtonStyle, color: 'var(--fg-2)' }}
            >
              ← ログインに戻る
            </button>
          )}
        </div>
      </div>
    </main>
  )
}



