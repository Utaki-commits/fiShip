'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getHolidayInfo } from '@/lib/holidays'

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
  logo_url: string
  banner_url: string
}

type Booking = {
  id: string
  date: string
  bin_type: string
  count: number
  status: string
}

type BinSetting = {
  id: string
  bin_type: 'day' | 'night'
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  fish_types: string[]
  max_capacity: number
}

type BinInfo = {
  setting: BinSetting
  remaining: number
  isFull: boolean
}

type Form = {
  name: string
  tel: string
  count: number
  bin_type: 'day' | 'night'
  fishing_style: string
  message: string
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES = ['日','月','火','水','木','金','土']

// Date → YYYY-MM-DD（タイムゾーン問題を回避）
const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

// 料金表示フォーマット（数字のみの場合はカンマ区切りで「円」を付ける）
const formatPrice = (price: string): string => {
  if (/^\d+$/.test(price.trim())) {
    return Number(price.trim()).toLocaleString('ja-JP') + '円'
  }
  return price
}

export default function ReservePage() {
  const params = useParams()
  const vesselId = params.vesselId as string

  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedBins, setSelectedBins] = useState<BinInfo[]>([])
  const [form, setForm] = useState<Form>({ name: '', tel: '', count: 1, bin_type: 'day', fishing_style: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState<{ isImmediate: boolean } | null>(null)
  const [formError, setFormError] = useState('')

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  useEffect(() => {
    const init = async () => {
      // UUID形式でない場合は早期リターン
      if (!UUID_REGEX.test(vesselId || '')) {
        console.error('Invalid vessel ID format:', vesselId)
        setFetchError('URLが正しくありません')
        setLoading(false)
        return
      }

      const { data: v, error: vErr } = await supabase.from('vessels').select('*').eq('id', vesselId).single()
      if (vErr) {
        console.error('Vessel fetch error:', vErr.code, vErr.message, 'details:', vErr.details, 'hint:', vErr.hint)
      }
      if (!v) { setLoading(false); return }
      setVessel(v)

      const [{ data: bk }, { data: bs }] = await Promise.all([
        supabase.from('bookings').select('id, date, bin_type, count, status').eq('vessel_id', vesselId).neq('status', 'rejected'),
        supabase.from('bin_settings').select('*').eq('vessel_id', vesselId),
      ])
      setBookings(bk || [])
      setBinSettings(bs || [])
      setLoading(false)
    }
    init()
  }, [vesselId])

  // 指定日に有効なbinSettingsを返す
  const getBinsForDate = (year: number, month: number, day: number): BinInfo[] => {
    const dow = new Date(year, month, day).getDay()
    return binSettings
      .filter(bin => {
        const inPeriod = bin.start_month <= bin.end_month
          ? bin.start_month <= month && month <= bin.end_month
          : month >= bin.start_month || month <= bin.end_month
        return inPeriod && bin.days_of_week.map(Number).includes(dow)
      })
      .sort((a, b) => (a.bin_type === b.bin_type ? 0 : a.bin_type === 'day' ? -1 : 1))
      .map(bin => {
        const dateStr = toDateStr(year, month, day)
        const used = bookings
          .filter(b => b.date === dateStr && b.bin_type === bin.bin_type && (b.status === 'confirmed' || b.status === 'pending'))
          .reduce((s, b) => s + b.count, 0)
        const remaining = bin.max_capacity - used
        return { setting: bin, remaining, isFull: remaining <= 0 }
      })
  }

  // 日付セルをタップしたとき
  const handleDateSelect = (year: number, month: number, day: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const clicked = new Date(year, month, day)
    if (clicked < today) return

    const bins = getBinsForDate(year, month, day)
    const available = bins.filter(b => !b.isFull)
    if (available.length === 0) return

    const dateStr = toDateStr(year, month, day)
    setSelectedDate(dateStr)
    setSelectedBins(bins)
    setCompleted(null)
    setFormError('')
    // 利用可能な最初の便を初期選択
    setForm(f => ({ ...f, count: 1, bin_type: available[0].setting.bin_type, name: '', tel: '', fishing_style: '', message: '' }))

    setTimeout(() => {
      document.getElementById('reserve-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 電話番号バリデーション（ハイフンを除いて11桁）
  const isValidTel = (tel: string): boolean => {
    const digits = tel.replace(/-/g, '')
    return /^\d{11}$/.test(digits)
  }

  // フォーム送信
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.tel.trim()) {
      setFormError('お名前と電話番号を入力してください')
      return
    }
    if (!isValidTel(form.tel)) {
      setFormError('電話番号は11桁（例：09012345678）または13桁（例：090-1234-5678）で入力してください')
      return
    }
    if (!selectedDate) return

    const activeBin = selectedBins.find(b => b.setting.bin_type === form.bin_type)
    if (!activeBin) return

    if (form.count > activeBin.remaining) {
      setFormError(`残り${activeBin.remaining}名分しか空きがありません`)
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
      if (!res.ok) { setFormError(data.error || '予約に失敗しました。もう一度お試しください。'); return }

      setCompleted({ isImmediate: data.isImmediate })

      // 予約リストを再取得して残数を更新
      const { data: bk } = await supabase
        .from('bookings').select('id, date, bin_type, count, status').eq('vessel_id', vesselId).neq('status', 'rejected')
      setBookings(bk || [])
    } catch {
      setFormError('通信エラーが発生しました。電波の状態を確認してください。')
    } finally {
      setSubmitting(false)
    }
  }

  // カレンダーの1セルを描画
  const renderCell = (year: number, month: number, day: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const cellDate = new Date(year, month, day)
    const dateStr = toDateStr(year, month, day)
    const isPast = cellDate < today
    const isToday = cellDate.getTime() === today.getTime()
    const isSelected = selectedDate === dateStr
    const dow = cellDate.getDay()

    const bins = isPast ? [] : getBinsForDate(year, month, day)
    const dayBin = bins.find(b => b.setting.bin_type === 'day') ?? null
    const nightBin = bins.find(b => b.setting.bin_type === 'night') ?? null
    const hasAvailable = bins.some(b => !b.isFull)
    const hasPending = bookings.some(b => b.date === dateStr && b.status === 'pending')
    const hasDay = bookings.some(b => b.date === dateStr && b.bin_type === 'day' && b.status !== 'rejected') || Boolean(dayBin)
    const hasNight = bookings.some(b => b.date === dateStr && b.bin_type === 'night' && b.status !== 'rejected') || Boolean(nightBin)
    // 祝日判定
    const holiday = getHolidayInfo(new Date(year, month, day))

    return (
      <div
        key={dateStr}
        onClick={() => {
          if (isSelected) {
            setSelectedDate(null)
            setSelectedBins([])
            return
          }
          if (!isPast && hasAvailable) handleDateSelect(year, month, day)
        }}
        style={{
          borderRadius: '10px',
          minHeight: '56px',
          cursor: isPast || (!hasAvailable && bins.length > 0) ? 'default' : bins.length === 0 ? 'default' : 'pointer',
          opacity: isPast ? 0.4 : 1,
          border: isSelected ? '3px solid var(--ocean)' : isToday ? '3px solid var(--gold)' : '3px solid transparent',
          padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: 700,
          color: (holiday || dow === 0) ? 'var(--status-full-fg)' : dow === 6 ? 'var(--ocean-light)' : 'var(--fg-1)' }}>
          {day}
        </span>

        {holiday && (
          <div style={{ fontSize: '10px', color: 'var(--status-full-fg)', fontWeight: 700,
            width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {holiday.name}
          </div>
        )}

        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
          {hasPending && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-pending-dot)' }} />}
          {hasDay && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ocean)' }} />}
          {hasNight && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-night-fg)' }} />}
        </div>
      </div>
    )
  }

  // カレンダーグリッド全体を生成
  const renderCalendar = () => {
    const firstDow = new Date(calYear, calM, 1).getDay()
    const totalDays = new Date(calYear, calM + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) {
      cells.push(<div key={`e${i}`} style={{ minHeight: '72px' }} />)
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push(renderCell(calYear, calM, d))
    }
    return cells
  }

  // 選択便の残席上限
  const activeBinInfo = selectedBins.find(b => b.setting.bin_type === form.bin_type)
  const maxCount = activeBinInfo?.remaining ?? 1

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '18px' }}>読み込み中...</div>
    </main>
  )

  if (!vessel) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚓</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '6px' }}>
          {fetchError || '船の情報が見つかりません'}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--fg-2)' }}>
          {fetchError ? 'QRコードや案内リンクからアクセスしてください' : 'URLが正しいか確認してください'}
        </div>
      </div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* ヘッダー */}
      <div style={{ background: 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)', padding: '32px 22px 48px', position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
        <div style={{ position: 'absolute', bottom: '-16px', left: 0, right: 0, height: '32px', background: 'var(--bg)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--gold)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⚓</div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--surface)', lineHeight: 1.2 }}>{vessel.name}</div>
            <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.82)', marginTop: '2px' }}>{vessel.captain_name} 船長</div>
          </div>
        </div>
        <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.82)', marginBottom: '4px' }}>
          📍 {vessel.prefecture}・{vessel.port_name}
        </div>
        {vessel.price && (
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)', marginBottom: '6px' }}>{formatPrice(vessel.price)}</div>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {vessel.beginner_accepted && (
            <span style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--surface)', fontSize: '14px', padding: '3px 10px', borderRadius: '99px' }}>初心者歓迎</span>
          )}
          {vessel.charter_accepted && (
            <span style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--surface)', fontSize: '14px', padding: '3px 10px', borderRadius: '99px' }}>貸切OK</span>
          )}
        </div>
      </div>

      <div style={{ padding: '12px' }}>

        {/* カレンダー */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '4px', textAlign: 'center' }}>
            ご希望の日を選んでください
          </div>
          <div style={{ fontSize: '14px', color: 'var(--fg-2)', marginBottom: '12px', textAlign: 'center' }}>
            色のついた日をタップすると予約フォームが開きます
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            {[
              { bg: 'var(--status-day-bg)', color: 'var(--ocean)', label: '昼便' },
              { bg: 'var(--status-night-bg)', color: 'var(--status-night-fg)', label: '夜便' },
              { bg: 'var(--status-full-bg)', color: 'var(--status-full-fg)', label: '満員' },
              { bg: 'var(--status-closed-bg)', color: 'var(--fg-3)', label: '休船日' },
            ].map(({ bg, color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: bg }} />
                <span style={{ fontSize: '14px', color, fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* 月ナビ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              onClick={() => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }}
              style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}
            >◀</button>
            <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--fg-1)' }}>{calYear}年{MONTH_NAMES[calM]}</span>
            <button
              onClick={() => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }}
              style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}
            >▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ fontSize: '14px', fontWeight: 700, textAlign: 'center', color: i === 0 ? 'var(--status-full-fg)' : i === 6 ? 'var(--ocean-light)' : 'var(--fg-3)' }}>{d}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>
        </div>

        {/* 予約フォーム */}
        {selectedDate && !completed && (
          <div id="reserve-form" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>

            {/* フォームヘッダー */}
            <div style={{ background: 'var(--ocean)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--surface)' }}>
                  {(() => { const d = new Date(selectedDate + 'T00:00:00'); return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）の予約` })()}
                </div>
                {activeBinInfo && (
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                    残り {activeBinInfo.remaining}名
                  </div>
                )}
              </div>
              <button
                onClick={() => { setSelectedDate(null); setCompleted(null) }}
                style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', color: 'var(--surface)', fontSize: '18px', cursor: 'pointer' }}
              >✕</button>
            </div>

            <div style={{ padding: '16px' }}>
              {formError && (
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-full-fg)', margin: '0 0 12px', padding: 0, lineHeight: 1.5 }}>
                  ⚠ {formError}
                </p>
              )}

              {/* 便の種類（複数便がある日のみ表示） */}
              {selectedBins.length > 1 && (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '8px' }}>便の種類</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    {selectedBins.map(b => {
                      const isDay = b.setting.bin_type === 'day'
                      const isActive = form.bin_type === b.setting.bin_type
                      return (
                        <button
                          key={b.setting.bin_type}
                          onClick={() => !b.isFull && setForm(f => ({ ...f, bin_type: b.setting.bin_type, count: 1 }))}
                          disabled={b.isFull}
                          style={{
                            padding: '14px 8px', textAlign: 'center', borderRadius: '10px',
                            cursor: b.isFull ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                            background: b.isFull ? 'var(--bg)' : isActive ? (isDay ? 'var(--status-day-bg)' : 'var(--status-night-bg)') : 'var(--surface)',
                            border: isActive
                              ? `2px solid ${isDay ? 'var(--ocean-light)' : 'var(--status-night-fg)'}`
                              : '2px solid var(--border)',
                            opacity: b.isFull ? 0.5 : 1,
                          }}
                        >
                          <div style={{ fontSize: '18px', fontWeight: 700, color: b.isFull ? 'var(--fg-3)' : isActive ? (isDay ? 'var(--ocean)' : 'var(--status-night-fg)') : 'var(--fg-2)' }}>
                            {isDay ? '☀️ 昼便' : '🌙 夜便'}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginTop: '4px' }}>
                            {b.isFull ? '満員' : `残り${b.remaining}名`}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginTop: '2px' }}>
                            {b.setting.departure_time} 出発
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* 単便のとき出発時刻を表示 */}
              {selectedBins.length === 1 && activeBinInfo && (
                <div style={{ background: activeBinInfo.setting.bin_type === 'day' ? 'var(--status-day-bg)' : 'var(--status-night-bg)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{activeBinInfo.setting.bin_type === 'day' ? '☀️' : '🌙'}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: activeBinInfo.setting.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)' }}>
                      {activeBinInfo.setting.bin_type === 'day' ? '昼便' : '夜便'}　{activeBinInfo.setting.departure_time} 出発
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--fg-2)', marginTop: '2px' }}>残り {activeBinInfo.remaining}名</div>
                  </div>
                </div>
              )}

              {/* 魚種表示（設定されていれば） */}
              {activeBinInfo && activeBinInfo.setting.fish_types.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 700, marginBottom: '6px' }}>この便で釣れる魚</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {activeBinInfo.setting.fish_types.map(f => (
                      <span key={f} style={{ fontSize: '14px', background: 'var(--status-closed-bg)', color: 'var(--fg-1)', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* お名前 */}
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
                お名前 <span style={{ background: 'var(--status-full-fg)', color: 'var(--surface)', fontSize: '14px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box' }}
                placeholder="例：山田 太郎"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />

              {/* 電話番号 */}
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
                電話番号 <span style={{ background: 'var(--status-full-fg)', color: 'var(--surface)', fontSize: '14px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box' }}
                placeholder="例：090-1234-5678"
                type="tel"
                value={form.tel}
                onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
              />

              {/* 人数 */}
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '10px' }}>
                人数 <span style={{ background: 'var(--status-full-fg)', color: 'var(--surface)', fontSize: '14px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '12px' }}>
                <button
                  onClick={() => setForm(f => ({ ...f, count: Math.max(1, f.count - 1) }))}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '20px', fontWeight: 700 }}
                >－</button>
                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ocean)' }}>{form.count}</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ocean)' }}>名</span>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, count: Math.min(maxCount, f.count + 1) }))}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '20px', fontWeight: 700 }}
                >＋</button>
              </div>

              {/* 釣り方（任意） */}
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
                釣り方 <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400 }}>（任意）</span>
              </label>
              <input
                style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box' }}
                placeholder="例：泳がせ、一つテンヤ"
                value={form.fishing_style}
                onChange={e => setForm(f => ({ ...f, fishing_style: e.target.value }))}
              />

              {/* メッセージ（任意） */}
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
                一言メッセージ <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400 }}>（任意）</span>
              </label>
              <textarea
                style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', marginBottom: '18px', boxSizing: 'border-box', resize: 'none', height: '80px' }}
                placeholder="質問・ご要望があればどうぞ"
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />

              {/* 送信ボタン */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%', padding: '17px', fontSize: '22px', fontWeight: 700,
                  background: submitting ? 'var(--border)' : 'var(--ocean)',
                  color: submitting ? 'var(--fg-3)' : 'var(--surface)',
                  border: 'none', borderRadius: '12px',
                  cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                }}
              >
                {submitting ? '送信中...' : '予約リクエストを送る　→'}
              </button>
            </div>
          </div>
        )}

        {/* 予約完了 */}
        {completed && (
          <div
            id="reserve-form"
            style={{
              background: completed.isImmediate ? 'var(--status-ok-bg)' : 'var(--status-pending-bg)',
              border: `1px solid ${completed.isImmediate ? 'var(--status-ok-bd)' : 'var(--status-pending-dot)'}`,
              borderRadius: '14px', padding: '24px 20px', marginBottom: '12px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>{completed.isImmediate ? '✅' : '⏳'}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: completed.isImmediate ? 'var(--status-ok-fg)' : 'var(--status-pending-fg)', marginBottom: '8px' }}>
              {completed.isImmediate ? '予約が完了しました！' : '予約リクエストを受け付けました'}
            </div>
            <div style={{ fontSize: '14px', color: completed.isImmediate ? 'var(--status-ok-fg)' : 'var(--status-pending-fg)', marginBottom: '16px', lineHeight: 1.6 }}>
              {completed.isImmediate
                ? `${vessel.name}の予約が確定しました。\n当日はお気をつけてお越しください。`
                : `船長が確認後、折り返しご連絡いたします。\nしばらくお待ちください。`}
            </div>
            <button
              onClick={() => { setSelectedDate(null); setCompleted(null) }}
              style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700, background: 'var(--ocean)', color: 'var(--surface)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              別の日を予約する
            </button>
          </div>
        )}

        {/* アクセス情報 */}
        {vessel.access && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '8px' }}>アクセス</div>
            <div style={{ fontSize: '14px', color: 'var(--fg-1)', lineHeight: 1.6 }}>{vessel.access}</div>
          </div>
        )}

      </div>
    </div>
  )
}



