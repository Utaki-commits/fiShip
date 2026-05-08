'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Step = 'start' | 'phone' | 'code'

const callbackUrl = 'https://fiship-project.vercel.app/auth/callback'
const lineProvider = (process.env.NEXT_PUBLIC_SUPABASE_LINE_PROVIDER || 'line') as Provider

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('start')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [phoneForAuth, setPhoneForAuth] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const routeByUser = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('確認できませんでした。もう一度お試しください。')
      return
    }

    const { data, error: vesselError } = await supabase
      .from('vessels')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (vesselError) {
      setError('船の情報を確認できませんでした。もう一度お試しください。')
      return
    }

    router.replace(data ? '/dashboard' : '/register')
  }

  const formatPhoneForAuth = (digits: string) => {
    if (!/^0\d{9,10}$/.test(digits)) return ''
    return `+81${digits.slice(1)}`
  }

  const startLine = async () => {
    setBusy(true)
    setError('')

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: lineProvider,
      options: {
        redirectTo: callbackUrl,
      },
    })

    if (oauthError) {
      setError('LINEを開けませんでした。時間をおいてもう一度お試しください。')
      setBusy(false)
    }
  }

  const sendSms = async () => {
    const phone = formatPhoneForAuth(phoneDigits)
    if (!phone) {
      setError('電話番号を数字だけで入力してください。')
      return
    }

    setBusy(true)
    setError('')

    const { error: smsError } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
      },
    })

    if (smsError) {
      setError('番号を送れませんでした。電話番号を確認してください。')
    } else {
      setPhoneForAuth(phone)
      setStep('code')
    }

    setBusy(false)
  }

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('6桁の番号を入力してください。')
      return
    }

    setBusy(true)
    setError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: phoneForAuth,
      token: code,
      type: 'sms',
    })

    if (verifyError) {
      setError('番号が合いません。もう一度確認してください。')
      setBusy(false)
      return
    }

    await routeByUser()
    setBusy(false)
  }

  const primaryButtonStyle = {
    width: '100%',
    minHeight: '64px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '22px',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: busy ? 'not-allowed' : 'pointer',
  }

  const outlineButtonStyle = {
    ...primaryButtonStyle,
    background: 'var(--surface)',
    color: 'var(--ocean)',
    border: '2px solid var(--border)',
  }

  const inputStyle = {
    width: '100%',
    minHeight: '64px',
    borderRadius: '10px',
    border: '2px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--fg-1)',
    fontSize: '22px',
    fontFamily: 'inherit',
    padding: '18px 16px',
    outline: 'none',
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
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'var(--gold)',
              color: 'var(--ocean-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 18px',
              fontWeight: 700,
            }}>
              ⚓
            </div>
            <h1 style={{
              margin: 0,
              color: 'var(--fg-1)',
              fontSize: '32px',
              fontWeight: 700,
              lineHeight: 1.3,
            }}>
              遊漁船予約システム
            </h1>
          </div>

          {error && (
            <div style={{
              background: 'var(--status-full-bg)',
              border: '2px solid var(--status-full-bd)',
              borderRadius: '12px',
              color: 'var(--status-full-fg)',
              fontSize: '18px',
              fontWeight: 700,
              lineHeight: 1.6,
              padding: '14px 16px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {step === 'start' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button
                type="button"
                onClick={startLine}
                disabled={busy}
                style={{
                  ...primaryButtonStyle,
                  background: busy ? 'var(--border)' : '#06C755',
                  color: busy ? 'var(--fg-3)' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#fff',
                  color: '#06C755',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  lineHeight: 1,
                }}>
                  LINE
                </span>
                {busy ? '開いています...' : 'LINEではじめる'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('phone')
                }}
                disabled={busy}
                style={outlineButtonStyle}
              >
                電話番号ではじめる
              </button>
            </div>
          )}

          {step === 'phone' && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--fg-1)',
                marginBottom: '10px',
              }}>
                電話番号
              </label>
              <input
                value={phoneDigits}
                onChange={(event) => setPhoneDigits(event.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel-national"
                placeholder="09012345678"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={sendSms}
                disabled={busy}
                style={{
                  ...primaryButtonStyle,
                  background: busy ? 'var(--border)' : 'var(--ocean)',
                  color: busy ? 'var(--fg-3)' : '#fff',
                  marginTop: '18px',
                }}
              >
                {busy ? '送っています...' : 'SMSに番号を送る'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('start')
                }}
                disabled={busy}
                style={{
                  ...outlineButtonStyle,
                  color: 'var(--fg-2)',
                  marginTop: '12px',
                }}
              >
                戻る
              </button>
            </div>
          )}

          {step === 'code' && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--fg-1)',
                marginBottom: '10px',
              }}>
                6桁の番号
              </label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="123456"
                style={{
                  ...inputStyle,
                  letterSpacing: '0.18em',
                  textAlign: 'center',
                }}
              />
              <button
                type="button"
                onClick={confirmCode}
                disabled={busy}
                style={{
                  ...primaryButtonStyle,
                  background: busy ? 'var(--border)' : 'var(--ocean)',
                  color: busy ? 'var(--fg-3)' : '#fff',
                  marginTop: '18px',
                }}
              >
                {busy ? '確認しています...' : '確認する'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setCode('')
                  setStep('phone')
                }}
                disabled={busy}
                style={{
                  ...outlineButtonStyle,
                  color: 'var(--fg-2)',
                  marginTop: '12px',
                }}
              >
                電話番号を直す
              </button>
            </div>
          )}

          <p style={{
            color: 'var(--fg-2)',
            fontSize: '16px',
            lineHeight: 1.6,
            textAlign: 'center',
            margin: '24px 0 0',
          }}>
            2回目以降は自動で開きます
          </p>
        </div>
      </section>
    </main>
  )
}
