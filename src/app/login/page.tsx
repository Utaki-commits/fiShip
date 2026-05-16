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
      options: { shouldCreateUser: true },
    })

    if (sendError) {
      setError('認証番号を送れませんでした。電話番号を確認してください。')
    } else {
      setPhoneForAuth(phone)
      setStep('code')
    }

    setBusy(false)
  }

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('6桁の認証番号を入力してください。')
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
      setError('認証番号が合いません。もう一度確認してください。')
      setBusy(false)
      return
    }

    router.replace('/auth/callback')
  }

  const primaryButton = 'min-h-0 w-full rounded-[9px] bg-[#B91C1C] px-4 py-[14px] text-[16px] font-medium text-white disabled:bg-[#E8DDD8] disabled:text-[#A8A29E]'
  const secondaryButton = 'min-h-0 w-full rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 py-[14px] text-[16px] font-medium text-[#57534E]'
  const inputClass = 'w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-[18px] font-normal text-[#1C1917] outline-none placeholder:text-[#A8A29E]'

  return (
    <main className="flex min-h-screen justify-center bg-[#F7F2EF] px-4 py-6">
      <section className="flex min-h-[calc(100vh-48px)] w-full max-w-[480px] flex-col justify-center">
        <div className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-5 py-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-[18px] h-16 w-16 overflow-hidden rounded-[16px]">
              <img src={DEFAULT_ICON} alt="FiShip" className="h-full w-full object-cover" />
            </div>
            <h1 className="m-0 text-[19px] font-medium leading-relaxed text-[#1C1917]">
              遊漁船予約管理サービス
            </h1>
          </div>

          {error && (
            <div className="mb-5 rounded-[12px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] px-4 py-[14px] text-[15px] font-medium leading-relaxed text-[#B91C1C]">
              {error}
            </div>
          )}

          {step === 'start' && (
            <div className="space-y-3">
              <button type="button" onClick={lineStart} disabled={busy} className={primaryButton}>
                LINEではじめる
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('phone')
                }}
                disabled={busy}
                className={secondaryButton}
              >
                電話番号ではじめる
              </button>

              <p className="pt-1 text-center text-[13px] font-normal leading-relaxed text-[#57534E]">
                ご利用いただくことで
                <a href="/legal/terms" target="_blank" className="mx-1 text-[#B91C1C] underline">利用規約</a>
                および
                <a href="/legal/privacy" target="_blank" className="mx-1 text-[#B91C1C] underline">プライバシーポリシー</a>
                に同意したものとみなします
              </p>
            </div>
          )}

          {step === 'phone' && (
            <div>
              <label className="mb-2 block text-[15px] font-medium text-[#57534E]">電話番号</label>
              <input
                value={phoneDigits}
                onChange={(event) => setPhoneDigits(event.target.value.replace(/\D/g, '').slice(0, 11))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="tel-national"
                placeholder="09012345678"
                className={inputClass}
              />
              <button type="button" onClick={sendCode} disabled={busy} className={`${primaryButton} mt-4`}>
                {busy ? '送信中...' : '認証番号を送る'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('start')
                }}
                disabled={busy}
                className={`${secondaryButton} mt-3`}
              >
                戻る
              </button>
            </div>
          )}

          {step === 'code' && (
            <div>
              <label className="mb-2 block text-[15px] font-medium text-[#57534E]">6桁の認証番号</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="123456"
                className={`${inputClass} text-center tracking-[0.18em]`}
              />
              <button type="button" onClick={verifyCode} disabled={busy} className={`${primaryButton} mt-4`}>
                {busy ? '確認中...' : '確認する'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setCode('')
                  setStep('phone')
                }}
                disabled={busy}
                className={`${secondaryButton} mt-3`}
              >
                電話番号を変更する
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-[13px] font-normal leading-relaxed text-[#57534E]">
            2回目以降は自動で開きます
          </p>
        </div>
      </section>
    </main>
  )
}
