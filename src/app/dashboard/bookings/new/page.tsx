'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type BinType = 'day' | 'night' | 'relay'

type ParsedResult = {
  date: string | null
  date_to: string | null
  bin_type: BinType | null
  name: string | null
  tel: string | null
  count: number | null
  note: string | null
  is_charter: boolean
}

type SavedMemo = {
  id: string
  message: string
  date: string
  dateTo: string
  binType: string
  count: number
  isCharter: boolean
  savedAt: string
}

const DAY_NAMES = ['日','月','火','水','木','金','土']
const OFFLINE_MEMO_KEY = 'fiship_offline_memos'

const normalizeBinType = (value: unknown): BinType | null => {
  if (value === 'day' || value === '昼' || value === '昼便') return 'day'
  if (value === 'night' || value === '夜' || value === '夜便') return 'night'
  if (value === 'relay' || value === '昼夜' || value === '昼夜便') return 'relay'
  if (typeof value === 'string') {
    const text = value.toLowerCase()
    if (text.includes('relay') || text.includes('昼夜')) return 'relay'
    if (text.includes('night') || text.includes('夜')) return 'night'
    if (text.includes('day') || text.includes('昼')) return 'day'
  }
  return null
}

const getBinLabel = (binType: BinType | null) =>
  binType === 'day' ? '☀️ 昼便' : binType === 'night' ? '🌙 夜便' : binType === 'relay' ? '🌅 昼夜便' : null

export default function NewBookingPage() {
  const router = useRouter()
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [binType, setBinType] = useState<BinType | ''>('')
  const [count, setCount] = useState(0)
  const [isCharter, setIsCharter] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')
  const [savedMemos, setSavedMemos] = useState<SavedMemo[]>([])
  const [sendingMemoId, setSendingMemoId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_MEMO_KEY)
    if (!stored) return
    try {
      setSavedMemos(JSON.parse(stored))
    } catch {
      localStorage.removeItem(OFFLINE_MEMO_KEY)
    }
  }, [])

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

  const persistSavedMemos = (memos: SavedMemo[]) => {
    setSavedMemos(memos)
    localStorage.setItem(OFFLINE_MEMO_KEY, JSON.stringify(memos))
  }

  const makeMemoId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  const buildParsed = (result: Record<string, unknown>, fallback: {
    date: string
    dateTo: string
    binType: string
    count: number
    isCharter: boolean
  }): ParsedResult => ({
    date: fallback.date || (typeof result.date === 'string' ? result.date : null),
    date_to: fallback.dateTo || (typeof result.date_to === 'string' ? result.date_to : null),
    bin_type: normalizeBinType(fallback.binType || result.bin_type),
    name: typeof result.name === 'string' ? result.name : null,
    tel: typeof result.tel === 'string' ? result.tel : null,
    count: fallback.count > 0 ? fallback.count : (typeof result.count === 'number' ? result.count : 1),
    note: typeof result.note === 'string' ? result.note : null,
    is_charter: Boolean(result.is_charter) || fallback.isCharter,
  })

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    setParsed(null)
    try {
      const res = await fetch('/api/analyze-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, date, binType, count }),
      })
      if (!res.ok) throw new Error('failed')
      const result = await res.json()
      const nextParsed = buildParsed(result, { date, dateTo, binType, count, isCharter })
      setParsed(nextParsed)
      if (nextParsed.is_charter) setIsCharter(true)
      if (nextParsed.date_to) setDateTo(nextParsed.date_to)
    } catch {
      const memo = {
        id: makeMemoId(),
        message,
        date,
        dateTo,
        binType,
        count,
        isCharter,
        savedAt: new Date().toISOString(),
      }
      persistSavedMemos([...savedMemos, memo])
      setError('電波が届きませんでした。メモとして保存しました。電波が回復したら送信できます。')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSendMemo = async (memo: SavedMemo) => {
    setSendingMemoId(memo.id)
    try {
      const res = await fetch('/api/analyze-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: memo.message,
          date: memo.date,
          binType: memo.binType,
          count: memo.count,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const result = await res.json()
      const nextParsed = buildParsed(result, {
        date: memo.date,
        dateTo: memo.dateTo || '',
        binType: memo.binType,
        count: memo.count,
        isCharter: memo.isCharter,
      })

      setParsed(nextParsed)
      setMessage(memo.message)
      setDate(memo.date)
      setDateTo(nextParsed.date_to || '')
      setBinType(nextParsed.bin_type || '')
      setCount(nextParsed.count || 0)
      setIsCharter(nextParsed.is_charter)

      persistSavedMemos(savedMemos.filter(m => m.id !== memo.id))
    } catch {
      alert('まだ電波が届きません。もう少し待ってから試してください。')
    } finally {
      setSendingMemoId(null)
    }
  }

  const handleDeleteMemo = (id: string) => {
    persistSavedMemos(savedMemos.filter(m => m.id !== id))
  }

  const handleRegister = async () => {
    if (!parsed || !vesselId) return
    if (parsed.date) {
      const bookingDate = new Date(parsed.date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (bookingDate < today) {
        setError('過去の日付には予約を登録できません。日付を確認してください。')
        return
      }
    }
    setRegistering(true)
    setError('')
    try {
      await supabase.from('booking_candidates').insert([{
        vessel_id: vesselId,
        channel: 'phone',
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
          date_to: parsed.date_to || dateTo || null,
          bin_type: parsed.bin_type || 'day',
          name: parsed.name || '名前不明',
          tel: parsed.tel || '',
          count: parsed.count || 1,
          message: parsed.note || '',
          channel: 'phone',
          status: 'confirmed',
          is_charter: parsed.is_charter || isCharter,
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
            {savedMemos.length > 0 && (
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-pending-fg)', marginBottom: '8px' }}>
                  ⚠️ 未送信のメモ {savedMemos.length}件
                </div>
                {savedMemos.map(memo => (
                  <div key={memo.id} style={{ background: 'var(--surface)', border: '2px solid var(--status-pending-dot)', borderRadius: '14px', padding: '16px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--fg-3)', marginBottom: '8px' }}>
                      {new Date(memo.savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} に保存
                    </div>
                    <div style={{ fontSize: '16px', color: 'var(--fg-1)', marginBottom: '6px', lineHeight: 1.6 }}>
                      「{memo.message}」
                    </div>
                    {(memo.date || memo.dateTo || memo.binType || memo.count > 0 || memo.isCharter) && (
                      <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginBottom: '10px' }}>
                        {memo.isCharter && '⛵ チャーター　'}
                        {memo.date && `${formatDate(memo.date)}`}
                        {memo.dateTo && ` 〜 ${formatDate(memo.dateTo)}`}
                        {memo.binType && `　${getBinLabel(normalizeBinType(memo.binType))}`}
                        {memo.count > 0 && `　${memo.count}名`}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleSendMemo(memo)}
                        disabled={sendingMemoId === memo.id}
                        style={{ flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700, background: sendingMemoId === memo.id ? 'var(--border)' : 'var(--ocean)', color: sendingMemoId === memo.id ? 'var(--fg-3)' : '#fff', border: 'none', borderRadius: '10px', cursor: sendingMemoId === memo.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                      >
                        {sendingMemoId === memo.id ? '送信中...' : '解析して送信する'}
                      </button>
                      <button
                        onClick={() => handleDeleteMemo(memo.id)}
                        style={{ padding: '14px 16px', fontSize: '16px', fontWeight: 700, background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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

                <button
                  type="button"
                  onClick={() => { setIsCharter(v => !v); if (isCharter) setDateTo('') }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '14px',
                    background: isCharter ? '#FBF3D4' : 'var(--surface)',
                    border: isCharter ? '2px solid var(--gold)' : '2px solid var(--border)',
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: isCharter ? '#7A5800' : 'var(--fg-1)' }}>貸切（チャーター）</div>
                    <div style={{ fontSize: '13px', color: isCharter ? '#7A5800' : 'var(--fg-2)', marginTop: '2px' }}>複数日の場合は終了日も入力してください</div>
                  </div>
                  <div style={{ width: '52px', height: '30px', borderRadius: '15px', background: isCharter ? 'var(--gold)' : '#D1D5DB', position: 'relative', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '3px', left: isCharter ? '25px' : '3px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.2)', transition: 'left .2s' }} />
                  </div>
                </button>

                {isCharter && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '6px' }}>
                      終了日 <span style={{ fontSize: '12px', color: 'var(--fg-3)', fontWeight: 400 }}>（複数日の場合）</span>
                    </div>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', color: 'var(--fg-1)', background: 'var(--surface)', boxSizing: 'border-box' as const }} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  {([
                    { key: 'day', label: '☀️ 昼便' },
                    { key: 'night', label: '🌙 夜便' },
                    { key: 'relay', label: '🌅 昼夜便' },
                  ] as const).map(({ key, label }) => (
                    <button key={key} onClick={() => setBinType(v => v === key ? '' : key)}
                      style={{ flex: 1, padding: '14px 6px', fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', background: binType === key ? 'var(--ocean-pale)' : 'var(--surface)', color: binType === key ? 'var(--ocean)' : 'var(--fg-3)', border: binType === key ? '3px solid var(--ocean)' : '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
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
                {parsed.is_charter && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', background: '#FBF3D4', borderRadius: '10px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--fg-3)', minWidth: '40px' }}>種別</span>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: '#7A5800' }}>⛵ チャーター</span>
                  </div>
                )}
                {[
                  { label: '日付', value: parsed.date ? formatDate(parsed.date) : null },
                  { label: '終了日', value: parsed.date_to ? formatDate(parsed.date_to) : null },
                  { label: '便', value: getBinLabel(parsed.bin_type) },
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
