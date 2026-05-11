'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

type Step = 'start' | 'phone' | 'code'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('start')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [phoneForAuth, setPhoneForAuth] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const lineStart = () => {
    window.location.href = '/api/auth/login'
  }

  const formatPhoneForAuth = (digits: string) => {
    if (!/^0\d{9,10}$/.test(digits)) return ''
    return `+81${digits.slice(1)}`
  }

  const sendCode = async () => {
    const phone = formatPhoneForAuth(phoneDigits)
    if (!phone) {
      setError('電話番号を数字だけで入力してください。')
      return
    }

    setBusy(true)
    setError('')

    const { error: sendError } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
      },
    })

    if (sendError) {
      setError('番号を送れませんでした。電話番号を確認してください。')
    } else {
      setPhoneForAuth(phone)
      setStep('code')
    }

    setBusy(false)
  }

  const verifyCode = async () => {
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

    router.replace('/auth/callback')
  }

  const buttonBase = {
    width: '100%',
    minHeight: '64px',
    borderRadius: '12px',
    fontFamily: 'inherit',
    fontSize: '22px',
    fontWeight: 700,
    cursor: busy ? 'not-allowed' : 'pointer',
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
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 18px' }}>
              <img src={DEFAULT_ICON} alt="fiShip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                onClick={lineStart}
                disabled={busy}
                style={{
                  ...buttonBase,
                  background: '#06C755',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#06C755',
                  border: '2px solid rgba(255,255,255,.85)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                    <path
                      d="M6 4v14h10"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                LINEではじめる
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('phone')
                }}
                disabled={busy}
                style={{
                  ...buttonBase,
                  background: 'var(--surface)',
                  color: 'var(--ocean)',
                  border: '2px solid var(--border)',
                }}
              >
                電話番号ではじめる
              </button>

              <p style={{ fontSize: '13px', color: 'var(--fg-2)', textAlign: 'center', marginTop: '2px', lineHeight: 1.8 }}>
                ご利用いただくことで
                <a href="/legal/terms" target="_blank" style={{ color: 'var(--ocean)', textDecoration: 'underline' }}>利用規約</a>
                および
                <a href="/legal/privacy" target="_blank" style={{ color: 'var(--ocean)', textDecoration: 'underline' }}>プライバシーポリシー</a>
                に同意したものとみなします
              </p>
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
                onClick={sendCode}
                disabled={busy}
                style={{
                  ...buttonBase,
                  background: busy ? 'var(--border)' : 'var(--ocean)',
                  color: busy ? 'var(--fg-3)' : '#fff',
                  border: 'none',
                  marginTop: '18px',
                }}
              >
                {busy ? '送っています...' : '番号を送る'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('start')
                }}
                disabled={busy}
                style={{
                  ...buttonBase,
                  background: 'var(--surface)',
                  color: 'var(--fg-2)',
                  border: '2px solid var(--border)',
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
                onClick={verifyCode}
                disabled={busy}
                style={{
                  ...buttonBase,
                  background: busy ? 'var(--border)' : 'var(--ocean)',
                  color: busy ? 'var(--fg-3)' : '#fff',
                  border: 'none',
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
                  ...buttonBase,
                  background: 'var(--surface)',
                  color: 'var(--fg-2)',
                  border: '2px solid var(--border)',
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
