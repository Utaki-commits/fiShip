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
    const allFull = bins.length > 0 && bins.every(b => b.isFull)
    const hasAvailable = bins.some(b => !b.isFull)

    // 昼便バンドの色・ラベル
    const dayBg = dayBin
      ? (dayBin.isFull ? '#FEE2E2' : '#E8F4FD')
      : null
    const dayLabel = dayBin
      ? (dayBin.isFull ? '昼　満員' : `昼　残${dayBin.remaining}`)
      : null
    const dayTextColor = dayBin
      ? (dayBin.isFull || dayBin.remaining <= 2 ? '#B91C1C' : '#0A3D62')
      : null

    // 夜便バンドの色・ラベル
    const nightBg = nightBin
      ? (nightBin.isFull ? '#FEE2E2' : '#EEF2FF')
      : null
    const nightLabel = nightBin
      ? (nightBin.isFull ? '夜　満員' : `夜　残${nightBin.remaining}`)
      : null
    const nightTextColor = nightBin
      ? (nightBin.isFull || nightBin.remaining <= 2 ? '#B91C1C' : '#4338CA')
      : null

    return (
      <div
        key={dateStr}
        onClick={() => !isPast && hasAvailable && handleDateSelect(year, month, day)}
        style={{
          borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          minHeight: '72px', transition: 'border-color .15s',
          cursor: isPast || (!hasAvailable && bins.length > 0) ? 'default' : bins.length === 0 ? 'default' : 'pointer',
          opacity: isPast ? 0.4 : 1,
          border: isSelected ? '2px solid #0A3D62' : isToday ? '2px solid #D4AC0D' : '2px solid transparent',
        }}
      >
        {/* 上段：日付（絶対配置を廃止してフレックス行で管理） */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '2px 3px', flexShrink: 0,
          background: bins.length === 0 ? (isPast ? '#F8F9FA' : '#F3F4F6') : '#fff',
          borderBottom: bins.length > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 700,
            color: dow === 0 ? '#B91C1C' : dow === 6 ? '#2E86C1' : '#374151',
          }}>{day}</span>
        </div>

        {/* 中・下段：便バンドを均等分割して中央寄せ */}
        {bins.length === 0 ? (
          <div style={{ flex: 1, background: isPast ? '#F8F9FA' : '#F3F4F6' }} />
        ) : (
          <>
            {dayBin && (
              <div style={{ flex: 1, background: dayBg!, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: nightBin ? '1px solid rgba(0,0,0,0.05)' : undefined }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: dayTextColor!, whiteSpace: 'nowrap' }}>{dayLabel}</span>
              </div>
            )}
            {nightBin && (
              <div style={{ flex: 1, background: nightBg!, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: nightTextColor!, whiteSpace: 'nowrap' }}>{nightLabel}</span>
              </div>
            )}
          </>
        )}
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
    <main style={{ minHeight: '100vh', background: '#0A3D62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  if (!vessel) return (
    <main style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚓</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
          {fetchError || '船の情報が見つかりません'}
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>
          {fetchError ? 'QRコードや案内リンクからアクセスしてください' : 'URLが正しいか確認してください'}
        </div>
      </div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* ヘッダー */}
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
        {vessel.price && (
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AC0D', marginBottom: '6px' }}>{formatPrice(vessel.price)}</div>
        )}
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

        {/* カレンダー */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px', textAlign: 'center' }}>
            ご希望の日を選んでください
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', textAlign: 'center' }}>
            色のついた日をタップすると予約フォームが開きます
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            {[
              { bg: '#E8F4FD', color: '#0A3D62', label: '昼便' },
              { bg: '#EEF2FF', color: '#4338CA', label: '夜便' },
              { bg: '#FEE2E2', color: '#B91C1C', label: '満員' },
              { bg: '#F3F4F6', color: '#9CA3AF', label: '休船日' },
            ].map(({ bg, color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: bg }} />
                <span style={{ fontSize: '10px', color, fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* 月ナビ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              onClick={() => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}
            >◀</button>
            <span style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>{calYear}年{MONTH_NAMES[calM]}</span>
            <button
              onClick={() => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}
            >▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', color: i === 0 ? '#B91C1C' : i === 6 ? '#2E86C1' : '#9CA3AF' }}>{d}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>
        </div>

        {/* 予約フォーム */}
        {selectedDate && !completed && (
          <div id="reserve-form" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>

            {/* フォームヘッダー */}
            <div style={{ background: '#0A3D62', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {(() => { const d = new Date(selectedDate + 'T00:00:00'); return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）の予約` })()}
                </div>
                {activeBinInfo && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                    残り {activeBinInfo.remaining}名
                  </div>
                )}
              </div>
              <button
                onClick={() => { setSelectedDate(null); setCompleted(null) }}
                style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
              >✕</button>
            </div>

            <div style={{ padding: '16px' }}>
              {formError && (
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#B91C1C', margin: '0 0 12px', padding: 0, lineHeight: 1.5 }}>
                  ⚠ {formError}
                </p>
              )}

              {/* 便の種類（複数便がある日のみ表示） */}
              {selectedBins.length > 1 && (
                <>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>便の種類</div>
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
                            background: b.isFull ? '#F8F9FA' : isActive ? (isDay ? '#E8F4FD' : '#EEF2FF') : '#fff',
                            border: isActive
                              ? `2px solid ${isDay ? '#2E86C1' : '#4338CA'}`
                              : '2px solid #E5E7EB',
                            opacity: b.isFull ? 0.5 : 1,
                          }}
                        >
                          <div style={{ fontSize: '15px', fontWeight: 700, color: b.isFull ? '#9CA3AF' : isActive ? (isDay ? '#0A3D62' : '#4338CA') : '#6B7280' }}>
                            {isDay ? '☀️ 昼便' : '🌙 夜便'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                            {b.isFull ? '満員' : `残り${b.remaining}名`}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
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
                <div style={{ background: activeBinInfo.setting.bin_type === 'day' ? '#E8F4FD' : '#EEF2FF', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{activeBinInfo.setting.bin_type === 'day' ? '☀️' : '🌙'}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: activeBinInfo.setting.bin_type === 'day' ? '#0A3D62' : '#4338CA' }}>
                      {activeBinInfo.setting.bin_type === 'day' ? '昼便' : '夜便'}　{activeBinInfo.setting.departure_time} 出発
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>残り {activeBinInfo.remaining}名</div>
                  </div>
                </div>
              )}

              {/* 魚種表示（設定されていれば） */}
              {activeBinInfo && activeBinInfo.setting.fish_types.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 700, marginBottom: '6px' }}>この便で釣れる魚</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {activeBinInfo.setting.fish_types.map(f => (
                      <span key={f} style={{ fontSize: '13px', background: '#F3F4F6', color: '#374151', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>
                        {f}
                      </span>
                    ))}
                  </div>
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

              {/* 人数 */}
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '10px' }}>
                人数 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '16px', padding: '12px', background: '#F8F9FA', borderRadius: '12px' }}>
                <button
                  onClick={() => setForm(f => ({ ...f, count: Math.max(1, f.count - 1) }))}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '20px', fontWeight: 700 }}
                >－</button>
                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#0A3D62' }}>{form.count}</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0A3D62' }}>名</span>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, count: Math.min(maxCount, f.count + 1) }))}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: '2px solid #E5E7EB', cursor: 'pointer', fontSize: '20px', fontWeight: 700 }}
                >＋</button>
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
                  width: '100%', padding: '17px', fontSize: '17px', fontWeight: 700,
                  background: submitting ? '#E5E7EB' : '#0A3D62',
                  color: submitting ? '#9CA3AF' : '#fff',
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
              background: completed.isImmediate ? '#D4EDDA' : '#FEF3C7',
              border: `1px solid ${completed.isImmediate ? '#86EFAC' : '#FCD34D'}`,
              borderRadius: '14px', padding: '24px 20px', marginBottom: '12px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>{completed.isImmediate ? '✅' : '⏳'}</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: completed.isImmediate ? '#1B6B3A' : '#92400E', marginBottom: '8px' }}>
              {completed.isImmediate ? '予約が完了しました！' : '予約リクエストを受け付けました'}
            </div>
            <div style={{ fontSize: '13px', color: completed.isImmediate ? '#1B6B3A' : '#92400E', marginBottom: '16px', lineHeight: 1.6 }}>
              {completed.isImmediate
                ? `${vessel.name}の予約が確定しました。\n当日はお気をつけてお越しください。`
                : `船長が確認後、折り返しご連絡いたします。\nしばらくお待ちください。`}
            </div>
            <button
              onClick={() => { setSelectedDate(null); setCompleted(null) }}
              style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700, background: '#0A3D62', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              別の日を予約する
            </button>
          </div>
        )}

        {/* アクセス情報 */}
        {vessel.access && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>アクセス</div>
            <div style={{ fontSize: '14px', color: '#111827', lineHeight: 1.6 }}>{vessel.access}</div>
          </div>
        )}

      </div>
    </div>
  )
}
