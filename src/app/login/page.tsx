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

  return (
    <main style={{
      minHeight: '100vh', background: '#0A3D62',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '32px 24px',
        width: '100%', maxWidth: '400px', fontFamily: 'sans-serif',
      }}>
        {/* アイコン・タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', background: '#D4AC0D', borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', margin: '0 auto 12px',
          }}>⚓</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{title}</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>{sub}</div>
        </div>

        {/* エラー */}
        {error && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#B91C1C',
          }}>
            {error}
          </div>
        )}

        {/* 完了メッセージ */}
        {message && (
          <div style={{
            background: '#D4EDDA', border: '1px solid #86EFAC', borderRadius: '8px',
            padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#1B6B3A', lineHeight: 1.6,
          }}>
            {message}
          </div>
        )}

        {!message && (
          <>
            {/* メールアドレス（新パスワード設定画面では非表示） */}
            {mode !== 'new-password' && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '6px' }}>
                  メールアドレス
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="例：yamada@example.com"
                  style={{
                    width: '100%', padding: '14px', fontSize: '15px',
                    border: '2px solid #E5E7EB', borderRadius: '10px',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* パスワード（リセット以外で表示） */}
            {mode !== 'reset' && (
              <div style={{ marginBottom: (mode === 'signup' || mode === 'new-password') ? '14px' : '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '6px' }}>
                  {mode === 'new-password' ? '新しいパスワード（8文字以上）' : `パスワード${mode === 'signup' ? '（8文字以上）' : ''}`}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={mode === 'signup' || mode === 'new-password' ? '8文字以上で入力' : 'パスワードを入力'}
                  style={{
                    width: '100%', padding: '14px', fontSize: '15px',
                    border: '2px solid #E5E7EB', borderRadius: '10px',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* パスワード確認（新規登録・新パスワード設定で表示） */}
            {(mode === 'signup' || mode === 'new-password') && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '6px' }}>
                  パスワード（確認）
                </div>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="もう一度入力"
                  style={{
                    width: '100%', padding: '14px', fontSize: '15px',
                    border: '2px solid #E5E7EB', borderRadius: '10px',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {mode === 'reset' && <div style={{ marginBottom: '24px' }} />}

            {/* メインボタン */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700,
                background: loading ? '#E5E7EB' : '#0A3D62',
                color: loading ? '#9CA3AF' : '#fff',
                border: 'none', borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {loading ? '処理中...' : btn}
            </button>
          </>
        )}

        {/* モード切り替えリンク */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          {mode === 'login' && (
            <>
              <button
                onClick={() => switchMode('reset')}
                style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
              >
                パスワードを忘れた方はこちら
              </button>
              <button
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', color: '#0A3D62', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
              >
                新規登録はこちら →
              </button>
            </>
          )}
          {(mode === 'signup' || mode === 'reset') && (
            <button
              onClick={() => switchMode('login')}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              ← ログインに戻る
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
