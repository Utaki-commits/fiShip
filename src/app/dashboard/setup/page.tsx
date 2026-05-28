'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle } from '../_components/CaptainShell'

type Vessel = {
  id: string
  name: string | null
}

const totalSteps = 4

const pageStyle = {
  maxWidth: '480px',
  margin: '0 auto',
  minHeight: '100vh',
  background: '#F4F6F2',
  color: '#1A2420',
  fontFamily: 'var(--font-sans)',
  padding: '20px 16px 32px',
  boxSizing: 'border-box' as const,
}

const setupCardStyle = {
  ...cardStyle,
  padding: '24px',
  marginBottom: 0,
}

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [copyLabel, setCopyLabel] = useState('URLをコピーする')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('vessels')
        .select('id, name')
        .eq('user_id', session.user.id)
        .single()

      if (!data) { router.push('/register'); return }
      setVessel(data as Vessel)

      const { count } = await supabase
        .from('bin_settings')
        .select('id', { count: 'exact', head: true })
        .eq('vessel_id', data.id)

      const params = new URLSearchParams(window.location.search)
      const requestedStep = Number(params.get('step') || 1)
      const nextStep = Number.isFinite(requestedStep) ? Math.min(Math.max(requestedStep, 1), totalSteps) : 1
      if (nextStep >= 3 && (count || 0) === 0) {
        setStep(2)
        setNotice('便を1件以上保存すると次に進めます。')
      } else {
        setStep(nextStep)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const reserveUrl = vessel
    ? `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/reserve/${vessel.id}`
    : ''

  const copyUrl = async () => {
    if (!reserveUrl) return
    await navigator.clipboard.writeText(reserveUrl)
    setCopyLabel('コピーしました ✓')
    setTimeout(() => setCopyLabel('URLをコピーする'), 1800)
  }

  const saveQr = () => {
    const svg = document.getElementById('setup-reserve-qr')
    if (!svg || !vessel) return
    const source = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fiship-reserve-${vessel.id}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  const completeSetup = async () => {
    if (!vessel) return
    setSaving(true)
    const { error } = await supabase
      .from('vessels')
      .update({ setup_completed: true })
      .eq('id', vessel.id)
    setSaving(false)
    if (error) {
      setNotice('完了できませんでした。もう一度お試しください。')
      return
    }
    router.push('/dashboard')
  }

  if (loading || !vessel) return <LoadingScreen />

  return (
    <main style={pageStyle}>
      <div style={{ color: colors.sub, fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>
        STEP {step} / {totalSteps}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            style={{
              height: '6px',
              borderRadius: '99px',
              background: index + 1 <= step ? '#1E4D3A' : '#CDD3DC',
            }}
          />
        ))}
      </div>

      {notice && (
        <div style={{ ...cardStyle, background: '#FEF2F2', color: '#B91C1C', border: '0.5px solid #FCA5A5' }}>
          {notice}
        </div>
      )}

      {step === 1 && (
        <section style={setupCardStyle}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>🚢</div>
          <h1 style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }}>船の情報を登録しましょう</h1>
          <p style={{ color: colors.sub, fontSize: '16px', lineHeight: 1.7, margin: '0 0 22px' }}>
            船名・出船場所・料金・定員を入力するだけで予約ページが完成します
          </p>
          <button onClick={() => router.push('/dashboard/vessel?setup=true')} style={{ ...primaryButtonStyle, width: '100%', padding: '16px' }}>
            登録する →
          </button>
        </section>
      )}

      {step === 2 && (
        <section style={setupCardStyle}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>⏰</div>
          <h1 style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }}>出船する便を設定しましょう</h1>
          <p style={{ color: colors.sub, fontSize: '16px', lineHeight: 1.7, margin: '0 0 22px' }}>
            昼便・夜便の出船時刻と定員を設定します
          </p>
          <button onClick={() => router.push('/dashboard/bins?setup=true')} style={{ ...primaryButtonStyle, width: '100%', padding: '16px' }}>
            設定する →
          </button>
        </section>
      )}

      {step === 3 && (
        <section style={setupCardStyle}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>📋</div>
          <h1 style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }}>既存の予約がありますか？</h1>
          <p style={{ color: colors.sub, fontSize: '16px', lineHeight: 1.7, margin: '0 0 22px' }}>
            すでに受けている予約があれば、先に取り込んでおくと運用を始めやすくなります
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            <button onClick={() => router.push('/dashboard/logs')} style={{ ...primaryButtonStyle, width: '100%', padding: '16px' }}>
              📷 写真で取り込む
            </button>
            <button disabled style={{ ...secondaryButtonStyle, width: '100%', padding: '16px', opacity: 0.65, cursor: 'not-allowed' }}>
              📅 Googleカレンダーから取り込む（準備中）
            </button>
            <button onClick={() => setStep(4)} style={{ border: 'none', background: 'transparent', color: '#5A6A78', padding: '14px', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
              スキップする →
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section style={setupCardStyle}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>🎉</div>
          <h1 style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 12px' }}>準備完了！</h1>
          <p style={{ color: colors.sub, fontSize: '16px', lineHeight: 1.7, margin: '0 0 20px' }}>
            このQRコードとURLをSNSやホームページに載せてください
          </p>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '18px', textAlign: 'center', marginBottom: '14px' }}>
            <QRCodeSVG id="setup-reserve-qr" value={reserveUrl} size={176} bgColor="#FFFFFF" fgColor="#1A2420" />
            <div style={{ color: colors.sub, fontSize: '13px', lineHeight: 1.6, wordBreak: 'break-all', marginTop: '12px' }}>
              {reserveUrl}
            </div>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <button onClick={copyUrl} style={{ ...secondaryButtonStyle, width: '100%', padding: '16px' }}>{copyLabel}</button>
            <button onClick={saveQr} style={{ ...secondaryButtonStyle, width: '100%', padding: '16px' }}>QRコードを保存する</button>
            <button disabled={saving} onClick={completeSetup} style={{ ...primaryButtonStyle, width: '100%', padding: '16px' }}>
              {saving ? '保存中...' : 'ダッシュボードへ →'}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
