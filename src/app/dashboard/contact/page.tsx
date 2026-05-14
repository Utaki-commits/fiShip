'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [vesselName, setVesselName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }
      const { data: v } = await supabase
        .from('vessels').select('id, name').eq('user_id', user.sub).single()
      if (v) { setVesselId(v.id); setVesselName(v.name) }
    }
    init()
  }, [router])

  const handleSend = async () => {
    if (!message.trim()) { setError('お問い合わせ内容を入力してください'); return }
    setSending(true)
    setError('')
    const { error: insertError } = await supabase.from('contacts').insert([{
      vessel_id: vesselId,
      name: vesselName,
      message: message.trim(),
    }])
    if (insertError) { setError('送信に失敗しました。もう一度お試しください。'); setSending(false); return }
    setDone(true)
    setSending(false)
  }

  const oceanGradient = 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)'

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: oceanGradient, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', minHeight: '80px' }}>
        <button onClick={() => router.push('/dashboard/account')}
          style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--surface)', fontSize: '22px', cursor: 'pointer' }}>
          ←
        </button>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--surface)' }}>お問い合わせ</div>
      </div>

      <div style={{ padding: '16px' }}>
        {done ? (
          <div style={{ background: 'var(--status-ok-bg)', border: '2px solid var(--status-ok-bd)', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--status-ok-fg)', marginBottom: '8px' }}>送信しました</div>
            <div style={{ fontSize: '16px', color: 'var(--status-ok-fg)', lineHeight: 1.7 }}>
              3〜5営業日以内にご連絡いたします。
            </div>
            <button onClick={() => router.push('/dashboard/account')}
              style={{ marginTop: '24px', padding: '14px 28px', fontSize: '18px', fontWeight: 700, background: 'var(--ocean)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              設定に戻る
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginTop: '8px' }}>
            <div style={{ fontSize: '16px', color: 'var(--fg-2)', lineHeight: 1.7, marginBottom: '20px' }}>
              ご不明な点やご要望がございましたらお気軽にお問い合わせください。
            </div>

            {error && (
              <div style={{ background: 'var(--status-full-bg)', border: '2px solid var(--status-full-bd)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', fontSize: '16px', fontWeight: 700, color: 'var(--status-full-fg)' }}>
                {error}
              </div>
            )}

            <label style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: '8px' }}>
              お問い合わせ内容 <span style={{ background: 'var(--status-full-fg)', color: '#fff', fontSize: '12px', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>必須</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="例：予約の変更方法を教えてください"
              style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', resize: 'none', height: '160px', boxSizing: 'border-box', color: 'var(--fg-1)', background: 'var(--surface)', marginBottom: '16px' }}
            />

            <button onClick={handleSend} disabled={sending}
              style={{ width: '100%', padding: '16px', fontSize: '20px', fontWeight: 700, background: sending ? 'var(--border)' : 'var(--ocean)', color: sending ? 'var(--fg-3)' : '#fff', border: 'none', borderRadius: '12px', cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {sending ? '送信中...' : '送信する'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
