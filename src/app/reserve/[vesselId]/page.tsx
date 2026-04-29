'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Vessel = {
  id: string
  name: string
  captain_name: string
  prefecture: string
  port_name: string
  access: string
  capacity: number
  departure_time: string
  charter_accepted: boolean
  beginner_accepted: boolean
  price: string
}

type Booking = {
  id: string
  date: string
  bin_type: string
  count: number
  status: string
  channel: string
}

type Form = {
  name: string
  tel: string
  count: number
  bin_type: string
  fishing_style: string
  message: string
}

type BookingResult = {
  isImmediate: boolean
}

export default function ReservePage() {
  const params = useParams()
  const vesselId = params.vesselId as string

  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [form, setForm] = useState<Form>({
    name: '', tel: '', count: 1, bin_type: '昼便', fishing_style: '', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<BookingResult | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const init = async () => {
      // 船の情報を取得
      const { data: v } = await supabase
        .from('vessels')
        .select('*')
        .eq('id', vesselId)
        .single()

      if (!v) { setLoading(false); return }
      setVessel(v)

      // 予約状況を取得（お断り以外）
      const { data: bk } = await supabase
        .from('bookings')
        .select('id, date, bin_type, count, status, channel')
        .eq('vessel_id', vesselId)
        .neq('status', 'rejected')

      setBookings(bk || [])
      setLoading(false)
    }
    init()
  }, [vesselId])

  // 指定日の予約情報を集計する
  const getDayInfo = (dateStr: string) => {
    const dayBookings = bookings.filter(b => b.date === dateStr)
    const confirmedCount = dayBookings
      .filter(b => b.status === 'confirmed')
      .reduce((s, b) => s + b.count, 0)
    const pendingCount = dayBookings.filter(b => b.status === 'pending').length
    const remaining = (vessel?.capacity ?? 0) - confirmedCount
    return { confirmedCount, pendingCount, remaining }
  }

  // 指定日の表示ステータスを判定する
  type DayStatus = 'available' | 'almost-full' | 'full' | 'has-pending'
  const getDayStatus = (dateStr: string): DayStatus => {
    const { remaining, pendingCount } = getDayInfo(dateStr)
    if (remaining <= 0) return 'full'
    if (remaining <= 2) return 'almost-full'
    if (pendingCount > 0) return 'has-pending'
    return 'available'
  }

  // 日付をタップしたときの処理
  const handleDateSelect = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(dateStr) < today) return
    if (getDayStatus(dateStr) === 'full') return

    setSelectedDate(dateStr)
    setResult(null)
    setFormError('')
    setForm({ name: '', tel: '', count: 1, bin_type: '昼便', fishing_style: '', message: '' })

    // フォームまでスクロール
    setTimeout(() => {
      document.getElementById('reserve-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 予約フォームを送信する
  const handleSubmit = async () => {
    if (!form.name || !form.tel) {
      setFormError('お名前と電話番号を入力してください')
      return
    }
    if (!selectedDate) return

    const { remaining } = getDayInfo(selectedDate)
    if (form.count > remaining) {
      setFormError(`残り${remaining}名分しか空きがありません`)
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          date: selectedDate,
          bin_type: form.bin_type,
          name: form.name,
          tel: form.tel,
          count: form.count,
          fishing_style: form.fishing_style || null,
          message: form.message || null,
          channel: 'page',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || '予約に失敗しました。もう一度お試しください。')
        return
      }

      setResult({ isImmediate: data.isImmediate })

      // 予約リストを再取得して残数を更新
      const { data: bk } = await supabase
        .from('bookings')
        .select('id, date, bin_type, count, status, channel')
        .eq('vessel_id', vesselId)
        .neq('status', 'rejected')
      setBookings(bk || [])

    } catch {
      setFormError('通信エラーが発生しました。電波の状態を確認してください。')
    } finally {
      setSubmitting(false)
    }
  }

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const dayNames = ['日','月','火','水','木','金','土']

  // カレンダーのセルを生成する
  const renderCalendar = () => {
    const fd = new Date(calYear, calM, 1).getDay()
    const tot = new Date(calYear, calM + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cells = []

    for (let i = 0; i < fd; i++) {
      cells.push(<div key={`e${i}`} />)
    }

    for (let d = 1; d <= tot; d++) {
      const dateStr = `${calYear}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const status = getDayStatus(dateStr)
      const { remaining } = getDayInfo(dateStr)
      const isToday = today.getFullYear() === calYear && today.getMonth() === calM && today.getDate() === d
      const isSelected = selectedDate === dateStr
      const isPast = new Date(dateStr) < today
      const isFull = status === 'full'
      const dow = (fd + d - 1) % 7

      // CLAUDE.md の色ルールに従う
      const bgColor = isSelected ? '#0A3D62'
        : isPast || isFull ? '#F1F5F9'
        : status === 'almost-full' ? '#FEE2E2'
        : status === 'has-pending' ? '#FEF3C7'
        : '#E8F4FD'

      const numColor = isSelected ? '#fff'
        : isPast || isFull ? '#9CA3AF'
        : dow === 0 ? '#B91C1C'
        : dow === 6 ? '#2E86C1'
        : '#111827'

      const labelColor = isSelected ? 'rgba(255,255,255,0.85)'
        : status === 'almost-full' ? '#B91C1C'
        : status === 'has-pending' ? '#92400E'
        : '#2E86C1'

      const labelText = isPast ? ''
        : isFull ? '満員'
        : status === 'almost-full' ? `残${remaining}`
        : status === 'has-pending' ? '要確認'
        : '空き'

      cells.push(
        <div
          key={d}
          onClick={() => handleDateSelect(dateStr)}
          style={{
            borderRadius: '8px',
            padding: '6px 2px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isPast || isFull ? 'default' : 'pointer',
            background: bgColor,
            minHeight: '56px',
            border: isToday && !isSelected ? '2px solid #D4AC0D' : '2px solid transparent',
            opacity: isPast ? 0.45 : 1,
            transition: 'all .15s',
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 700, color: numColor, lineHeight: 1 }}>{d}</span>
          {labelText && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: labelColor, marginTop: '3px', lineHeight: 1 }}>
              {labelText}
            </span>
          )}
        </div>
      )
    }
    return cells
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#0A3D62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: '16px' }}>読み込み中...</div>
      </main>
    )
  }

  if (!vessel) {
    return (
      <main style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚓</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>船の情報が見つかりません</div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>URLが正しいか確認してください</div>
        </div>
      </main>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* ヘッダー：船の情報 */}
      <div style={{ background: '#0A3D62', padding: '20px 16px 34px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-16px', left: 0, right: 0, height: '32px', background: '#F8F9FA', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', background: '#D4AC0D', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚓</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{vessel.name}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>{vessel.captain_name} 船長</div>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginBottom: '4px' }}>
          📍 {vessel.prefecture}・{vessel.port_name}
        </div>
        {vessel.price ? (
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#D4AC0D', marginBottom: '6px' }}>{vessel.price}</div>
        ) : null}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {vessel.beginner_accepted && (
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', padding: '3px 10px', borderRadius: '99px' }}>初心者歓迎</span>
          )}
          {vessel.charter_accepted && (
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', padding: '3px 10px', borderRadius: '99px' }}>貸切OK</span>
          )}
        </div>
      </div>

      <div style={{ padding: '12px' }}>

        {/* カレンダーセクション */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px', textAlign: 'center' }}>
            ご希望の日を選んでください
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', textAlign: 'center' }}>
            タップすると予約フォームが開きます
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            {[
              { bg: '#E8F4FD', label: '空きあり', color: '#2E86C1' },
              { bg: '#FEE2E2', label: '残りわずか', color: '#B91C1C' },
              { bg: '#FEF3C7', label: '要確認', color: '#92400E' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: item.bg, border: '1px solid #E5E7EB', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: item.color, fontWeight: 700 }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* 月ナビゲーション */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              onClick={() => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}
            >◀</button>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>{calYear}年{monthNames[calM]}</span>
            <button
              onClick={() => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}
            >▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {dayNames.map((d, i) => (
              <div key={d} style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', color: i === 0 ? '#B91C1C' : i === 6 ? '#2E86C1' : '#9CA3AF' }}>{d}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>
        </div>

        {/* 予約フォーム（日付が選択されていて、完了前に表示） */}
        {selectedDate && !result && (
          <div id="reserve-form" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ background: '#0A3D62', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {new Date(selectedDate + 'T00:00:00').getMonth() + 1}月{new Date(selectedDate + 'T00:00:00').getDate()}日の予約
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  残り {getDayInfo(selectedDate).remaining}名
                </div>
              </div>
              <button
                onClick={() => { setSelectedDate(null); setResult(null) }}
                style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>

            <div style={{ padding: '16px' }}>
              {formError && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#B91C1C' }}>
                  {formError}
                </div>
              )}

              {/* お名前 */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                お名前 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box' }}
                placeholder="例：山田 太郎"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />

              {/* 電話番号 */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                電話番号 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box' }}
                placeholder="例：090-1234-5678"
                type="tel"
                value={form.tel}
                onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
              />

              {/* 人数（ステッパー） */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '10px' }}>
                人数 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '16px', padding: '12px', background: '#F8F9FA', borderRadius: '12px' }}>
                <button
                  onClick={() => setForm(f => ({ ...f, count: Math.max(1, f.count - 1) }))}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                >－</button>
                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#0A3D62' }}>{form.count}</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0A3D62' }}>名</span>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, count: Math.min(vessel.capacity, f.count + 1) }))}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                >＋</button>
              </div>

              {/* 便の種類 */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '8px' }}>便の種類</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {['昼便', '夜便'].map(bt => (
                  <button
                    key={bt}
                    onClick={() => setForm(f => ({ ...f, bin_type: bt }))}
                    style={{
                      padding: '14px 8px',
                      textAlign: 'center',
                      background: form.bin_type === bt ? '#E8F4FD' : '#fff',
                      border: form.bin_type === bt ? '2px solid #2E86C1' : '2px solid #E5E7EB',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: form.bin_type === bt ? '#0A3D62' : '#6B7280',
                    }}
                  >
                    {bt === '昼便' ? '☀️ 昼便' : '🌙 夜便'}
                  </button>
                ))}
              </div>

              {/* 釣り方（任意） */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                釣り方 <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>（任意）</span>
              </label>
              <input
                style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box' }}
                placeholder="例：泳がせ、一つテンヤ"
                value={form.fishing_style}
                onChange={e => setForm(f => ({ ...f, fishing_style: e.target.value }))}
              />

              {/* メッセージ（任意） */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                一言メッセージ <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 400 }}>（任意）</span>
              </label>
              <textarea
                style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '18px', boxSizing: 'border-box', resize: 'none', height: '80px' }}
                placeholder="質問・ご要望があればどうぞ"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />

              {/* 送信ボタン */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '17px',
                  fontSize: '17px',
                  fontWeight: 700,
                  background: submitting ? '#E5E7EB' : '#0A3D62',
                  color: submitting ? '#9CA3AF' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? '送信中...' : '予約リクエストを送る　→'}
              </button>
            </div>
          </div>
        )}

        {/* 予約完了メッセージ */}
        {result && (
          <div
            id="reserve-form"
            style={{
              background: result.isImmediate ? '#D4EDDA' : '#FEF3C7',
              border: `1px solid ${result.isImmediate ? '#86EFAC' : '#FCD34D'}`,
              borderRadius: '14px',
              padding: '24px 20px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>
              {result.isImmediate ? '✅' : '⏳'}
            </div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: result.isImmediate ? '#1B6B3A' : '#92400E', marginBottom: '8px' }}>
              {result.isImmediate ? '予約が完了しました！' : '予約リクエストを受け付けました'}
            </div>
            <div style={{ fontSize: '13px', color: result.isImmediate ? '#1B6B3A' : '#92400E', marginBottom: '16px', lineHeight: 1.6 }}>
              {result.isImmediate
                ? `${vessel.name}の予約が確定しました。\n当日はお気をつけてお越しください。`
                : `船長が確認後、折り返しご連絡いたします。\nしばらくお待ちください。`}
            </div>
            <button
              onClick={() => { setSelectedDate(null); setResult(null) }}
              style={{
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: 700,
                background: '#0A3D62',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              別の日を予約する
            </button>
          </div>
        )}

        {/* アクセス情報 */}
        {vessel.access ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>アクセス</div>
            <div style={{ fontSize: '14px', color: '#111827', lineHeight: 1.6 }}>{vessel.access}</div>
          </div>
        ) : null}

        {/* 出船時刻 */}
        {vessel.departure_time ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>出船時刻</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0A3D62' }}>{vessel.departure_time}</div>
          </div>
        ) : null}

      </div>
    </div>
  )
}
