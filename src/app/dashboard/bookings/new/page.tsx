'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ParsedResult = {
  date: string | null
  bin_type: 'day' | 'night' | null
  name: string | null
  tel: string | null
  count: number | null
  note: string | null
}

const DAY_NAMES = ['日','月','火','水','木','金','土']

export default function NewBookingPage() {
  const router = useRouter()
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [binType, setBinType] = useState<'day'|'night'|''>('')
  const [count, setCount] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }
      const { data: v } = await supabase
        .from('vessels').select('id').eq('user_id', user.sub).single()
      if (!v) { router.push('/register'); return }
      setVesselId(v.id)
    }
    init()
  }, [router])

  const normalizeBinType = (value: unknown): 'day' | 'night' | null => {
    if (value === 'day' || value === '昼' || value === '昼便') return 'day'
    if (value === 'night' || value === '夜' || value === '夜便') return 'night'
    const text = typeof value === 'string' ? value.toLowerCase() : ''
    if (text.includes('night') || text.includes('夜')) return 'night'
    if (text.includes('day') || text.includes('昼')) return 'day'
    return null
  }

  const handleAnalyze = async () => {
    if (!vesselId) return
    setAnalyzing(true)
    setError('')
    setParsed(null)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          vessel_id: vesselId,
          channel: 'line',
        }),
      })
      if (!res.ok) throw new Error('extract failed')

      const data = await res.json()
      const result = data.extracted || {}

      setParsed({
        date: date || result.date || null,
        bin_type: (binType || normalizeBinType(result.bin_type || result.bin_preference)) as 'day' | 'night' | null,
        name: result.name || null,
        tel: result.tel || null,
        count: count > 0 ? count : (result.count || 1),
        note: result.note || result.fishing_style || null,
      })
    } catch {
      setError('解析に失敗しました。もう一度お試しください。')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleRegister = async () => {
    if (!parsed || !vesselId) return
    setRegistering(true)
    setError('')
    try {
      await supabase.from('booking_candidates').insert([{
        vessel_id: vesselId,
        channel: 'line',
        raw_message: message,
        parsed_date: parsed.date,
        parsed_bin_type: parsed.bin_type,
        parsed_name: parsed.name,
        parsed_tel: parsed.tel,
        parsed_count: parsed.count || 1,
        parsed_note: parsed.note,
        status: 'approved',
      }])

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          date: parsed.date || new Date().toISOString().split('T')[0],
          bin_type: parsed.bin_type || 'day',
          name: parsed.name || '名前不明',
          tel: parsed.tel || '',
          count: parsed.count || 1,
          message: parsed.note || '',
          channel: 'line',
        }),
      })
      if (!res.ok) throw new Error('booking failed')
      router.push('/dashboard/bookings')
    } catch {
      setError('登録に失敗しました。')
      setRegistering(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
  }

  const oceanGradient = 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)'

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: oceanGradient, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 20, minHeight: '80px' }}>
        <button onClick={() => router.back()}
          style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>
          ←
        </button>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>メモから予約を入れる</div>
      </div>

      <div style={{ padding: '16px' }}>
        {error && (
          <div style={{ background: 'var(--status-full-bg)', border: '2px solid var(--status-full-bd)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', fontSize: '16px', fontWeight: 700, color: 'var(--status-full-fg)' }}>
            {error}
          </div>
        )}

        {!parsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>
                メッセージ・メモ
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="例：「土曜昼便2人 たなか 090-XXXX」"
                style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', resize: 'none', height: '120px', boxSizing: 'border-box' as const, color: 'var(--fg-1)', background: 'var(--surface)', display: 'block' }}
              />
            </div>

            <details style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
              <summary style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-3)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
                <span>補足情報を入力する（任意）</span>
                <span>▼</span>
              </summary>

              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', color: 'var(--fg-1)', background: 'var(--surface)', boxSizing: 'border-box' as const }} />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setBinType(v => v === 'day' ? '' : 'day')}
                    style={{ flex: 1, padding: '14px', fontSize: '18px', fontWeight: 700, fontFamily: 'inherit', background: binType === 'day' ? 'var(--status-day-bg)' : 'var(--surface)', color: binType === 'day' ? 'var(--ocean)' : 'var(--fg-3)', border: binType === 'day' ? '3px solid var(--ocean-light)' : '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer' }}>
                    ☀️ 昼便
                  </button>
                  <button onClick={() => setBinType(v => v === 'night' ? '' : 'night')}
                    style={{ flex: 1, padding: '14px', fontSize: '18px', fontWeight: 700, fontFamily: 'inherit', background: binType === 'night' ? 'var(--status-night-bg)' : 'var(--surface)', color: binType === 'night' ? 'var(--status-night-fg)' : 'var(--fg-3)', border: binType === 'night' ? '3px solid var(--status-night-fg)' : '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer' }}>
                    🌙 夜便
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '8px 0' }}>
                  <button onClick={() => setCount(v => Math.max(0, v - 1))}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '24px', fontWeight: 700, color: 'var(--fg-2)' }}>－</button>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: count > 0 ? 'var(--ocean)' : 'var(--fg-3)' }}>
                      {count > 0 ? count : '?'}
                    </span>
                    <span style={{ fontSize: '18px', color: 'var(--fg-3)', marginLeft: '4px' }}>名</span>
                  </div>
                  <button onClick={() => setCount(v => v + 1)}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '24px', fontWeight: 700, color: 'var(--fg-2)' }}>＋</button>
                </div>
              </div>
            </details>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || !message.trim()}
              style={{ width: '100%', padding: '18px', fontSize: '20px', fontWeight: 700, background: analyzing || !message.trim() ? 'var(--border)' : 'var(--ocean)', color: analyzing || !message.trim() ? 'var(--fg-3)' : '#fff', border: 'none', borderRadius: '14px', cursor: analyzing || !message.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {analyzing ? 'AI解析中...' : '解析する'}
            </button>
          </div>
        )}

        {parsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--surface)', border: '2px solid var(--status-ok-bd)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-ok-fg)', marginBottom: '14px' }}>
                ✅ 解析結果
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {[
                  { label: '日付', value: parsed.date ? formatDate(parsed.date) : null },
                  { label: '便', value: parsed.bin_type === 'day' ? '☀️ 昼便' : parsed.bin_type === 'night' ? '🌙 夜便' : null },
                  { label: '人数', value: parsed.count ? `${parsed.count}名` : null },
                  { label: '氏名', value: parsed.name },
                  { label: '電話', value: parsed.tel },
                  { label: 'メモ', value: parsed.note },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--fg-3)', minWidth: '40px' }}>{label}</span>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: value ? 'var(--fg-1)' : 'var(--status-full-fg)' }}>
                      {value || '不明'}
                    </span>
                  </div>
                ))}
              </div>

              {(!parsed.date || !parsed.bin_type || !parsed.name) && (
                <div style={{ marginTop: '12px', background: 'var(--status-pending-bg)', border: '2px solid var(--status-pending-dot)', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: 'var(--status-pending-fg)' }}>
                  ⚠️ {[!parsed.date && '日付', !parsed.bin_type && '便', !parsed.name && '氏名'].filter(Boolean).join('・')}が不明です。登録後に編集できます。
                </div>
              )}
            </div>

            {message && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--fg-3)', marginBottom: '4px' }}>元メッセージ</div>
                <div style={{ fontSize: '14px', color: 'var(--fg-2)', lineHeight: 1.6 }}>「{message}」</div>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={registering}
              style={{ width: '100%', padding: '18px', fontSize: '20px', fontWeight: 700, background: registering ? 'var(--border)' : 'var(--status-ok-bg)', color: registering ? 'var(--fg-3)' : 'var(--status-ok-fg)', border: `2px solid ${registering ? 'var(--border)' : 'var(--status-ok-bd)'}`, borderRadius: '14px', cursor: registering ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {registering ? '登録中...' : 'この内容で予約を登録する'}
            </button>

            <button
              onClick={() => setParsed(null)}
              style={{ width: '100%', padding: '16px', fontSize: '17px', fontWeight: 700, background: 'transparent', color: 'var(--fg-2)', border: '2px solid var(--border)', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              入力し直す
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
