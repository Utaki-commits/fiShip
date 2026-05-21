'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getHolidayInfo } from '@/lib/holidays'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

// ---- 型定義 ----
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
  map_embed_url: string
}

type Booking = {
  id: string
  date: string
  date_to: string | null
  bin_type: string
  count: number
  status: string
  is_charter: boolean
}

type BinSetting = {
  id: string
  name: string | null
  bin_type: 'day' | 'night' | 'relay'
  price: string
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  fish_types: string[]
  max_capacity: number
}

type BlockedDate = {
  id: string
  vessel_id: string
  date_from: string
  date_to: string
  bin_type: string | null
  type: 'maintenance' | 'weather' | 'trouble' | 'other'
  reason: string
  created_at: string
}

type BinInfo = {
  setting: BinSetting
  confirmedRemaining: number
  pendingCount: number
  actualRemaining: number
  remaining: number
  isFull: boolean
  isConfirmedFull: boolean
}

type Form = {
  name: string
  tel: string
  count: number
  bin_setting_id: string
  bin_type: 'day' | 'night' | 'relay'
  fishing_style: string
  message: string
}

type Step = 'calendar' | 'bin' | 'form'

// ---- 定数 ----
const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES = ['日','月','火','水','木','金','土']

// ---- ユーティリティ ----
const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const formatPrice = (price: string): string => {
  if (/^\d+$/.test(price.trim())) {
    return Number(price.trim()).toLocaleString('ja-JP') + '円'
  }
  return price
}

const getBinDefaultName = (binType: 'day' | 'night' | 'relay') =>
  binType === 'day' ? '昼便' : binType === 'relay' ? '昼夜便' : '夜便'

// ---- 旭波デザイントークン（インラインスタイル用） ----
const K = {
  bg: '#F7F2EF',
  surface: '#FFFFFF',
  border: '#E8DDD8',
  headerBg: '#7F1D1D',
  primary: '#B91C1C',
  primaryLight: '#FEF2F2',
  primaryBorder: '#FCA5A5',
  fg1: '#1C1917',
  fg2: '#78716C',
  fg3: '#A8A29E',
  dayBadgeBg: '#DBEAFE',
  dayBadgeFg: '#1E3A8A',
  nightBadgeBg: '#EDE9FE',
  nightBadgeFg: '#5B21B6',
  relayBadgeBg: '#FEF9C3',
  relayBadgeFg: '#713F12',
  confirmed: '#059669',
  pending: '#D97706',
  pendingBg: '#FFFBEB',
  fullBg: '#FEF2F2',
  okBg: '#F0FDF4',
  okFg: '#059669',
  okBd: '#BBF7D0',
  font: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
} as const

const getBinBadgeStyle = (binType: 'day' | 'night' | 'relay') => ({
  background: binType === 'day' ? K.dayBadgeBg : binType === 'night' ? K.nightBadgeBg : K.relayBadgeBg,
  color: binType === 'day' ? K.dayBadgeFg : binType === 'night' ? K.nightBadgeFg : K.relayBadgeFg,
  fontSize: '13px',
  fontWeight: 500,
  padding: '3px 10px',
  borderRadius: '20px',
  display: 'inline-block',
})

// ---- メインコンポーネント ----
export default function ReservePage() {
  const params = useParams()
  const vesselId = params.vesselId as string

  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])

  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedBins, setSelectedBins] = useState<BinInfo[]>([])

  const [step, setStep] = useState<Step>('calendar')
  const [form, setForm] = useState<Form>({ name: '', tel: '', count: 1, bin_setting_id: '', bin_type: 'day', fishing_style: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState<{ isImmediate: boolean } | null>(null)
  const [formError, setFormError] = useState('')

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  useEffect(() => {
    document.body.style.background = K.bg
    document.body.dataset.colormode = 'light'
    document.body.dataset.fontsize = 'medium'
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!UUID_REGEX.test(vesselId || '')) {
        setFetchError('URLが正しくありません')
        setLoading(false)
        return
      }
      const { data: v, error: vErr } = await supabase.from('vessels').select('*').eq('id', vesselId).single()
      if (vErr) console.error('Vessel fetch error:', vErr.message)
      if (!v) { setLoading(false); return }
      setVessel(v)
      const [{ data: bk }, { data: bs }, { data: bd }] = await Promise.all([
        supabase.from('bookings').select('id, date, date_to, bin_type, count, status, is_charter').eq('vessel_id', vesselId).neq('status', 'rejected'),
        supabase.from('bin_settings').select('*').eq('vessel_id', vesselId).eq('enabled', true),
        supabase.from('blocked_dates').select('*').eq('vessel_id', vesselId),
      ])
      setBookings(bk || [])
      setBinSettings(bs || [])
      setBlockedDates(bd || [])
      setLoading(false)
    }
    init()
  }, [vesselId])

  // 指定日の便情報を計算
  const getBinsForDate = (year: number, month: number, day: number): BinInfo[] => {
    const dow = new Date(year, month, day).getDay()
    return binSettings
      .filter(bin => {
        const inPeriod = bin.start_month <= bin.end_month
          ? bin.start_month <= month && month <= bin.end_month
          : month >= bin.start_month || month <= bin.end_month
        return inPeriod && bin.days_of_week.map(Number).includes(dow)
      })
      .sort((a, b) => ['day', 'relay', 'night'].indexOf(a.bin_type) - ['day', 'relay', 'night'].indexOf(b.bin_type))
      .flatMap(bin => {
        const dateStr = toDateStr(year, month, day)
        const isBlocked = (blockedDates || []).some(b => {
          const inRange = b.date_from <= dateStr && dateStr <= b.date_to
          const binMatch = !b.bin_type || b.bin_type === bin.bin_type
          return inRange && binMatch
        })
        if (isBlocked) return []
        const confirmedUsed = bookings.filter(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'confirmed').reduce((s, b) => s + b.count, 0)
        const pendingCount = bookings.filter(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'pending').reduce((s, b) => s + b.count, 0)
        const confirmedRemaining = bin.max_capacity - confirmedUsed
        const actualRemaining = bin.max_capacity - confirmedUsed - pendingCount
        return [{
          setting: bin,
          confirmedRemaining,
          pendingCount,
          actualRemaining,
          remaining: actualRemaining,
          isFull: actualRemaining <= 0,
          isConfirmedFull: confirmedRemaining <= 0,
        }]
      })
  }

  const handleDateSelect = (year: number, month: number, day: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const clicked = new Date(year, month, day)
    if (clicked < today) return
    const bins = getBinsForDate(year, month, day)
    const selectable = bins.filter(b => !b.isConfirmedFull)
    if (selectable.length === 0) return
    const available = bins.filter(b => !b.isFull)
    const initialBin = available[0] || selectable[0]
    const dateStr = toDateStr(year, month, day)
    setSelectedDate(dateStr)
    setSelectedBins(bins)
    setCompleted(null)
    setFormError('')
    setForm(f => ({
      ...f,
      count: 1,
      bin_setting_id: initialBin.setting.id,
      bin_type: initialBin.setting.bin_type,
      name: '',
      tel: '',
      fishing_style: '',
      message: '',
    }))
    setStep('bin')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isValidTel = (tel: string): boolean => {
    const cleaned = tel.replace(/[-\s()]/g, '')
    return /^\d{10,11}$/.test(cleaned) || /^\+\d{7,15}$/.test(cleaned)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.tel.trim()) { setFormError('お名前と電話番号を入力してください'); return }
    if (!isValidTel(form.tel)) { setFormError('電話番号は国内番号または国際電話番号で入力してください'); return }
    if (!selectedDate) return
    const activeBin = selectedBins.find(b => b.setting.id === form.bin_setting_id)
    if (!activeBin) return
    if (form.count > activeBin.actualRemaining) { setFormError(`残り${activeBin.actualRemaining}名分しか空きがありません`); return }
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
      const { data: bk } = await supabase.from('bookings').select('id, date, date_to, bin_type, count, status, is_charter').eq('vessel_id', vesselId).neq('status', 'rejected')
      setBookings(bk || [])
    } catch {
      setFormError('通信エラーが発生しました。電波の状態を確認してください。')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- カレンダーセル ----
  const renderCell = (year: number, month: number, day: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const cellDate = new Date(year, month, day)
    const dateStr = toDateStr(year, month, day)
    const isCharterDate = bookings.some(b => { if (!b.is_charter || !b.date_to) return false; return b.date <= dateStr && dateStr <= b.date_to })
    const isPast = cellDate < today
    const isToday = cellDate.getTime() === today.getTime()
    const isSelected = selectedDate === dateStr
    const dow = cellDate.getDay()
    const bins = isPast ? [] : getBinsForDate(year, month, day)
    const hasAvailable = bins.some(b => !b.isConfirmedFull)
    const isClosed = bins.length === 0 && !isPast
    const isFull = bins.length > 0 && bins.every(b => b.isFull)
    const isLow = bins.some(b => !b.isFull && b.remaining > 0 && b.remaining <= 3)
    const holiday = getHolidayInfo(new Date(year, month, day))

    // セル背景色
    let cellBg = K.surface
    let cellBorderColor = K.border
    if (isPast || isCharterDate) {
      cellBg = '#F5F0ED'
    } else if (isFull) {
      cellBg = '#FEF2F2'
      cellBorderColor = '#FCA5A5'
    } else if (isClosed) {
      cellBg = '#F5F0ED'
    } else if (isSelected) {
      cellBg = '#FEF2F2'
      cellBorderColor = K.primary
    }

    const dayColor = (holiday || dow === 0) ? K.primary : dow === 6 ? K.dayBadgeFg : K.fg1

    return (
      <div
        key={dateStr}
        onClick={() => {
          if (isCharterDate || isPast) return
          if (isSelected) { setSelectedDate(null); setSelectedBins([]); setStep('calendar'); return }
          if (hasAvailable) handleDateSelect(year, month, day)
        }}
        style={{
          borderRadius: '8px',
          minHeight: '52px',
          cursor: (!isPast && !isCharterDate && hasAvailable) ? 'pointer' : 'default',
          opacity: isPast ? 0.38 : 1,
          border: `0.5px solid ${isSelected ? K.primary : cellBorderColor}`,
          outline: isSelected ? `2px solid ${K.primary}` : isToday ? `1.5px solid ${K.pending}` : 'none',
          outlineOffset: '-1px',
          background: cellBg,
          padding: '5px 3px 4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 500, color: dayColor, lineHeight: 1 }}>
          {day}
        </span>

        {holiday && (
          <div style={{ fontSize: '9px', color: K.primary, fontWeight: 400, width: '100%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {holiday.name}
          </div>
        )}

        {isCharterDate && (
          <div style={{ fontSize: '9px', color: K.fg3, fontWeight: 400, width: '100%', textAlign: 'center', lineHeight: 1.2 }}>貸切</div>
        )}

        {/* 残席インジケーター */}
        {!isPast && !isCharterDate && bins.length > 0 && (
          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
            {bins.map(b => (
              <div
                key={b.setting.id}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: b.isFull
                    ? '#FCA5A5'
                    : b.setting.bin_type === 'day'
                    ? K.dayBadgeFg
                    : b.setting.bin_type === 'night'
                    ? K.nightBadgeFg
                    : K.pending,
                }}
              />
            ))}
          </div>
        )}

        {isFull && !isCharterDate && (
          <div style={{ fontSize: '9px', color: K.primary, fontWeight: 500, lineHeight: 1 }}>満</div>
        )}
        {isClosed && !isCharterDate && !isPast && (
          <div style={{ fontSize: '9px', color: K.fg3, fontWeight: 400, lineHeight: 1 }}>×</div>
        )}
        {isLow && !isFull && (
          <div style={{ fontSize: '9px', color: K.pending, fontWeight: 500, lineHeight: 1 }}>残少</div>
        )}
      </div>
    )
  }

  const renderCalendarGrid = () => {
    const firstDow = new Date(calYear, calM, 1).getDay()
    const totalDays = new Date(calYear, calM + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} style={{ minHeight: '52px' }} />)
    for (let d = 1; d <= totalDays; d++) cells.push(renderCell(calYear, calM, d))
    return cells
  }

  const activeBinInfo = selectedBins.find(b => b.setting.id === form.bin_setting_id)
  const maxCount = activeBinInfo?.actualRemaining ?? 1

  // ---- ローディング ----
  if (loading) return (
    <main style={{ minHeight: '100vh', background: K.headerBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#ffffff', fontSize: '17px', fontFamily: K.font, fontWeight: 400 }}>読み込み中...</div>
    </main>
  )

  // ---- 船が見つからない ----
  if (!vessel) return (
    <main style={{ minHeight: '100vh', background: K.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: K.font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', margin: '0 auto 12px' }}>
          <img src={DEFAULT_ICON} alt="fiShip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 500, color: K.fg1, marginBottom: '6px' }}>
          {fetchError || '船の情報が見つかりません'}
        </div>
        <div style={{ fontSize: '14px', color: K.fg2, fontWeight: 400 }}>
          {fetchError ? 'QRコードや案内リンクからアクセスしてください' : 'URLが正しいか確認してください'}
        </div>
      </div>
    </main>
  )

  // ---- 予約完了画面 ----
  if (completed) return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: K.bg, fontFamily: K.font }}>
      <KyokuhaHeader vessel={vessel} />
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          background: completed.isImmediate ? K.okBg : K.pendingBg,
          border: `0.5px solid ${completed.isImmediate ? K.okBd : '#FDE68A'}`,
          borderRadius: '12px',
          padding: '28px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>{completed.isImmediate ? '✅' : '⏳'}</div>
          <div style={{ fontSize: '20px', fontWeight: 500, color: completed.isImmediate ? K.okFg : K.pending, marginBottom: '8px' }}>
            {completed.isImmediate ? '予約が完了しました' : '予約リクエストを受け付けました'}
          </div>
          <div style={{ fontSize: '14px', color: K.fg2, fontWeight: 400, lineHeight: 1.7, marginBottom: '20px' }}>
            {completed.isImmediate
              ? `${vessel.name}への予約が確定しました。\n当日はお気をつけてお越しください。`
              : '船長が確認後、折り返しご連絡いたします。\nしばらくお待ちください。'}
          </div>
          <button
            onClick={() => { setSelectedDate(null); setCompleted(null); setStep('calendar'); window.scrollTo({ top: 0 }) }}
            style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 500, background: K.primary, color: '#ffffff', border: 'none', borderRadius: '9px', cursor: 'pointer', fontFamily: K.font }}
          >
            別の日を予約する
          </button>
        </div>
      </div>
    </div>
  )

  // ---- STEP 2: 便選択 ----
  if (step === 'bin' && selectedDate) {
    const d = new Date(selectedDate + 'T00:00:00')
    const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`

    return (
      <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: K.bg, fontFamily: K.font }}>
        <KyokuhaHeader vessel={vessel} />

        {/* ステップインジケーター */}
        <StepIndicator current={2} />

        <div style={{ padding: '16px' }}>
          {/* 日付表示 */}
          <div style={{ fontSize: '17px', fontWeight: 500, color: K.fg1, marginBottom: '14px', textAlign: 'center' }}>
            {dateLabel}の便を選んでください
          </div>

          {/* 便カード */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {selectedBins.map(b => {
              const isActive = form.bin_setting_id === b.setting.id
              const badgeStyle = getBinBadgeStyle(b.setting.bin_type)
              return (
                <div
                  key={b.setting.id}
                  onClick={() => {
                    if (b.isConfirmedFull) return
                    setForm(f => ({ ...f, bin_setting_id: b.setting.id, bin_type: b.setting.bin_type, count: 1 }))
                  }}
                  style={{
                    background: K.surface,
                    border: `0.5px solid ${isActive ? K.primary : K.border}`,
                    outline: isActive ? `1.5px solid ${K.primary}` : 'none',
                    outlineOffset: '-1px',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: b.isConfirmedFull ? 'not-allowed' : 'pointer',
                    opacity: b.isConfirmedFull ? 0.45 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={badgeStyle}>{b.setting.name || getBinDefaultName(b.setting.bin_type)}</span>
                      {b.isFull && (
                        <span style={{ fontSize: '12px', color: K.primary, background: K.primaryLight, border: `0.5px solid ${K.primaryBorder}`, borderRadius: '20px', padding: '2px 8px', fontWeight: 500 }}>満員</span>
                      )}
                      {!b.isFull && b.remaining <= 3 && (
                        <span style={{ fontSize: '12px', color: K.pending, background: K.pendingBg, border: '0.5px solid #FDE68A', borderRadius: '20px', padding: '2px 8px', fontWeight: 500 }}>残り{b.remaining}名</span>
                      )}
                    </div>
                    {/* ラジオインジケーター */}
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `0.5px solid ${isActive ? K.primary : K.border}`, background: isActive ? K.primary : K.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isActive && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />}
                    </div>
                  </div>

                  <div style={{ fontSize: '22px', fontWeight: 500, color: K.fg1, marginBottom: '6px' }}>
                    {b.setting.departure_time} 出発
                  </div>

                  {b.setting.price && (
                    <div style={{ fontSize: '15px', fontWeight: 500, color: K.fg2, marginBottom: '6px' }}>
                      {formatPrice(b.setting.price)}
                    </div>
                  )}

                  {!b.isFull && b.remaining > 3 && (
                    <div style={{ fontSize: '13px', color: K.fg3, fontWeight: 400 }}>残り{b.remaining}名</div>
                  )}

                  {/* 設備バッジ */}
                  {b.setting.fish_types.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {b.setting.fish_types.map(f => (
                        <span key={f} style={{ fontSize: '12px', color: K.fg2, background: K.bg, border: `0.5px solid ${K.border}`, borderRadius: '20px', padding: '2px 8px', fontWeight: 400 }}>{f}</span>
                      ))}
                    </div>
                  )}

                  {/* 承認待ちがある場合の注意 */}
                  {b.pendingCount > 0 && !b.isFull && (
                    <div style={{ fontSize: '12px', color: K.pending, fontWeight: 400, marginTop: '6px', lineHeight: 1.5 }}>
                      承認待ち{b.pendingCount}名分の予約が入っています
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* この便を予約するボタン */}
          <button
            onClick={() => { setFormError(''); setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={!activeBinInfo || activeBinInfo.isConfirmedFull}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '17px',
              fontWeight: 500,
              background: (!activeBinInfo || activeBinInfo.isConfirmedFull) ? K.border : K.primary,
              color: (!activeBinInfo || activeBinInfo.isConfirmedFull) ? K.fg3 : '#ffffff',
              border: 'none',
              borderRadius: '9px',
              cursor: (!activeBinInfo || activeBinInfo.isConfirmedFull) ? 'not-allowed' : 'pointer',
              fontFamily: K.font,
              marginBottom: '12px',
            }}
          >
            この便を予約する
          </button>

          {vessel.charter_accepted && (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: K.fg2, fontWeight: 400 }}>
                貸切でのご利用は
              </span>
              <button
                onClick={() => alert('貸切のご予約はお電話にてお問い合わせください')}
                style={{ fontSize: '14px', color: K.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: K.font, fontWeight: 500, padding: 0, textDecoration: 'underline' }}
              >
                こちら →
              </button>
            </div>
          )}

          {/* 戻るリンク */}
          <button
            onClick={() => { setStep('calendar'); setSelectedDate(null) }}
            style={{ display: 'block', margin: '20px auto 0', fontSize: '14px', color: K.fg3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: K.font, fontWeight: 400 }}
          >
            ← 日付を選び直す
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 3: 予約フォーム ----
  if (step === 'form' && selectedDate && activeBinInfo) {
    const d = new Date(selectedDate + 'T00:00:00')
    const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
    const badgeStyle = getBinBadgeStyle(activeBinInfo.setting.bin_type)

    return (
      <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: K.bg, fontFamily: K.font }}>
        <KyokuhaHeader vessel={vessel} />
        <StepIndicator current={3} />

        <div style={{ padding: '16px' }}>

          {/* 選択内容サマリー（変更不可） */}
          <div style={{ background: K.surface, border: `0.5px solid ${K.border}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: K.fg3, fontWeight: 400, marginBottom: '6px' }}>選択中の内容</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: K.fg1 }}>{dateLabel}</span>
              <span style={badgeStyle}>{activeBinInfo.setting.name || getBinDefaultName(activeBinInfo.setting.bin_type)}</span>
              <span style={{ fontSize: '14px', color: K.fg2, fontWeight: 400 }}>{activeBinInfo.setting.departure_time} 出発</span>
            </div>
            {activeBinInfo.setting.price && (
              <div style={{ fontSize: '14px', color: K.fg2, fontWeight: 400, marginTop: '4px' }}>{formatPrice(activeBinInfo.setting.price)}</div>
            )}
          </div>

          {formError && (
            <div style={{ background: K.primaryLight, border: `0.5px solid ${K.primaryBorder}`, borderRadius: '9px', padding: '12px 14px', marginBottom: '14px', fontSize: '14px', color: K.primary, fontWeight: 500 }}>
              {formError}
            </div>
          )}

          {/* お名前 */}
          <FormLabel required>お名前</FormLabel>
          <input
            style={{ width: '100%', padding: '14px', fontSize: '17px', fontWeight: 400, border: `0.5px solid ${K.border}`, borderRadius: '9px', outline: 'none', fontFamily: K.font, marginBottom: '14px', boxSizing: 'border-box', background: K.surface, color: K.fg1 }}
            placeholder="例：山田 太郎"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          {/* 電話番号 */}
          <FormLabel required>電話番号</FormLabel>
          <input
            style={{ width: '100%', padding: '14px', fontSize: '17px', fontWeight: 400, border: `0.5px solid ${K.border}`, borderRadius: '9px', outline: 'none', fontFamily: K.font, marginBottom: '14px', boxSizing: 'border-box', background: K.surface, color: K.fg1 }}
            placeholder="例：090-1234-5678"
            type="tel"
            value={form.tel}
            onChange={e => setForm(f => ({ ...f, tel: e.target.value }))}
          />

          {/* 人数 */}
          <FormLabel required>人数</FormLabel>
          <div style={{ marginBottom: '14px' }}>
            {/* 1〜4名ボタン選択 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => n <= maxCount && setForm(f => ({ ...f, count: n }))}
                  disabled={n > maxCount}
                  style={{
                    flex: 1,
                    height: '48px',
                    borderRadius: '9px',
                    border: `0.5px solid ${form.count === n ? K.primary : K.border}`,
                    outline: form.count === n ? `1.5px solid ${K.primary}` : 'none',
                    outlineOffset: '-1px',
                    background: form.count === n ? K.primaryLight : K.surface,
                    color: form.count === n ? K.primary : n > maxCount ? K.fg3 : K.fg1,
                    fontSize: '17px',
                    fontWeight: form.count === n ? 500 : 400,
                    cursor: n > maxCount ? 'not-allowed' : 'pointer',
                    fontFamily: K.font,
                    opacity: n > maxCount ? 0.45 : 1,
                  }}
                >
                  {n}名
                </button>
              ))}
            </div>
            {/* 5名以上 */}
            {maxCount >= 5 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: K.fg2, fontWeight: 400, whiteSpace: 'nowrap' }}>5名以上:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <button
                    onClick={() => setForm(f => ({ ...f, count: Math.max(5, f.count - 1) }))}
                    disabled={form.count < 5}
                    style={{ width: '40px', height: '40px', borderRadius: '9px', border: `0.5px solid ${K.border}`, background: K.surface, cursor: form.count < 5 ? 'not-allowed' : 'pointer', fontSize: '18px', fontFamily: K.font, color: K.fg2, opacity: form.count < 5 ? 0.4 : 1 }}
                  >－</button>
                  <button
                    onClick={() => setForm(f => ({ ...f, count: 5 }))}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '9px',
                      border: `0.5px solid ${form.count >= 5 ? K.primary : K.border}`,
                      outline: form.count >= 5 ? `1.5px solid ${K.primary}` : 'none',
                      outlineOffset: '-1px',
                      background: form.count >= 5 ? K.primaryLight : K.surface,
                      color: form.count >= 5 ? K.primary : K.fg1,
                      fontSize: '17px',
                      fontWeight: form.count >= 5 ? 500 : 400,
                      cursor: 'pointer',
                      fontFamily: K.font,
                    }}
                  >
                    {form.count >= 5 ? `${form.count}名` : '5名以上'}
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, count: Math.min(maxCount, Math.max(5, f.count) + 1) }))}
                    disabled={form.count >= maxCount}
                    style={{ width: '40px', height: '40px', borderRadius: '9px', border: `0.5px solid ${K.border}`, background: K.surface, cursor: form.count >= maxCount ? 'not-allowed' : 'pointer', fontSize: '18px', fontFamily: K.font, color: K.fg2, opacity: form.count >= maxCount ? 0.4 : 1 }}
                  >＋</button>
                </div>
              </div>
            )}
          </div>

          {/* メッセージ（任意） */}
          <FormLabel>一言メッセージ <span style={{ fontSize: '13px', color: K.fg3, fontWeight: 400 }}>（任意）</span></FormLabel>
          <textarea
            style={{ width: '100%', padding: '14px', fontSize: '17px', fontWeight: 400, border: `0.5px solid ${K.border}`, borderRadius: '9px', outline: 'none', fontFamily: K.font, marginBottom: '20px', boxSizing: 'border-box', resize: 'none', height: '88px', background: K.surface, color: K.fg1 }}
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
              padding: '14px',
              fontSize: '17px',
              fontWeight: 500,
              background: submitting ? K.border : K.primary,
              color: submitting ? K.fg3 : '#ffffff',
              border: 'none',
              borderRadius: '9px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: K.font,
              marginBottom: '12px',
            }}
          >
            {submitting ? '送信中...' : '予約を申し込む'}
          </button>

          <button
            onClick={() => setStep('bin')}
            style={{ display: 'block', margin: '0 auto', fontSize: '14px', color: K.fg3, background: 'none', border: 'none', cursor: 'pointer', fontFamily: K.font, fontWeight: 400 }}
          >
            ← 便を選び直す
          </button>
        </div>
      </div>
    )
  }

  // ---- STEP 1: 船情報 + カレンダー ----
  return (
    <div style={{ maxWidth: '390px', margin: '0 auto', minHeight: '100vh', background: K.bg, fontFamily: K.font }}>

      {/* ヘッダー（旭波） */}
      <KyokuhaHeader vessel={vessel} />

      <StepIndicator current={1} />

      <div style={{ padding: '16px' }}>

        {/* 船情報カード */}
        <div style={{ background: K.surface, border: `0.5px solid ${K.border}`, borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
          {/* 港名・料金 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '14px', color: K.fg2, fontWeight: 400, marginBottom: '2px' }}>
                {vessel.prefecture}・{vessel.port_name}
              </div>
              {vessel.price && (
                <div style={{ fontSize: '18px', fontWeight: 500, color: K.fg1 }}>{formatPrice(vessel.price)}</div>
              )}
            </div>
            <button
              onClick={() => {/* 詳細モーダルなど */}}
              style={{ fontSize: '13px', color: K.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: K.font, fontWeight: 500, whiteSpace: 'nowrap', padding: 0 }}
            >
              詳細を見る →
            </button>
          </div>

          {/* 基本設備 */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: K.fg2, background: K.bg, border: `0.5px solid ${K.border}`, borderRadius: '20px', padding: '3px 10px', fontWeight: 400 }}>駐車場あり</span>
            <span style={{ fontSize: '12px', color: K.fg2, background: K.bg, border: `0.5px solid ${K.border}`, borderRadius: '20px', padding: '3px 10px', fontWeight: 400 }}>トイレあり</span>
            <span style={{ fontSize: '12px', color: K.fg2, background: K.bg, border: `0.5px solid ${K.border}`, borderRadius: '20px', padding: '3px 10px', fontWeight: 400 }}>ライフジャケット貸出</span>
            {vessel.beginner_accepted && (
              <span style={{ fontSize: '12px', color: K.okFg, background: K.okBg, border: `0.5px solid ${K.okBd}`, borderRadius: '20px', padding: '3px 10px', fontWeight: 400 }}>初心者歓迎</span>
            )}
            {vessel.charter_accepted && (
              <span style={{ fontSize: '12px', color: K.dayBadgeFg, background: K.dayBadgeBg, border: `0.5px solid #BFDBFE`, borderRadius: '20px', padding: '3px 10px', fontWeight: 400 }}>貸切OK</span>
            )}
          </div>
        </div>

        {/* カレンダーカード */}
        <div style={{ background: K.surface, border: `0.5px solid ${K.border}`, borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: K.fg1, marginBottom: '3px', textAlign: 'center' }}>
            ご希望の日をタップしてください
          </div>
          <div style={{ fontSize: '13px', color: K.fg3, fontWeight: 400, marginBottom: '12px', textAlign: 'center' }}>
            色のついた日が予約可能です
          </div>

          {/* 月ナビ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              onClick={() => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }}
              style={{ width: '40px', height: '40px', borderRadius: '9px', background: K.bg, border: `0.5px solid ${K.border}`, cursor: 'pointer', fontSize: '14px', color: K.fg1, fontFamily: K.font }}
            >◀</button>
            <span style={{ fontSize: '18px', fontWeight: 500, color: K.fg1 }}>{calYear}年{MONTH_NAMES[calM]}</span>
            <button
              onClick={() => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }}
              style={{ width: '40px', height: '40px', borderRadius: '9px', background: K.bg, border: `0.5px solid ${K.border}`, cursor: 'pointer', fontSize: '14px', color: K.fg1, fontFamily: K.font }}
            >▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ fontSize: '13px', fontWeight: 500, textAlign: 'center', color: i === 0 ? K.primary : i === 6 ? K.dayBadgeFg : K.fg3 }}>{d}</div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendarGrid()}
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { dot: K.dayBadgeFg, label: '昼便' },
              { dot: K.nightBadgeFg, label: '夜便' },
              { dot: K.pending, label: '昼夜便' },
              { dot: '#FCA5A5', label: '満員' },
            ].map(({ dot, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: K.fg2, fontWeight: 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ---- 旭波ヘッダーコンポーネント ----
function KyokuhaHeader({ vessel }: { vessel: Vessel }) {
  const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'
  const K = {
    headerBg: '#7F1D1D',
    font: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* バナー画像エリア */}
      {vessel.banner_url && (
        <div style={{ height: '160px', overflow: 'hidden' }}>
          <img
            src={vessel.banner_url}
            alt={vessel.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '160px', background: 'rgba(0,0,0,0.45)' }} />
        </div>
      )}

      {/* ヘッダーバー */}
      <div style={{
        background: K.headerBg,
        padding: vessel.banner_url ? '14px 16px 16px' : '28px 16px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 旭日放射パターン */}
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.10, pointerEvents: 'none' }}
          viewBox="0 0 390 120"
          preserveAspectRatio="xMidYMid slice"
        >
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i * 360) / 18
            const rad = (angle * Math.PI) / 180
            const cx = 195; const cy = 200
            const len = 320
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(rad) * len}
                y2={cy + Math.sin(rad) * len}
                stroke="white"
                strokeWidth="12"
              />
            )
          })}
        </svg>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '0.5px solid rgba(255,255,255,0.3)' }}>
            <img src={vessel.logo_url || DEFAULT_ICON} alt={`${vessel.name} ロゴ`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', lineHeight: 1.2, fontFamily: K.font }}>
              {vessel.name}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', fontWeight: 400, marginTop: '2px', fontFamily: K.font }}>
              {vessel.captain_name} 船長
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- ステップインジケーター ----
function StepIndicator({ current }: { current: number }) {
  const steps = ['日程', '便選択', '予約情報']
  const K = {
    primary: '#B91C1C',
    bg: '#F7F2EF',
    border: '#E8DDD8',
    fg2: '#78716C',
    fg3: '#A8A29E',
    surface: '#FFFFFF',
    font: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
  }

  return (
    <div style={{ background: K.surface, borderBottom: `0.5px solid ${K.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', fontFamily: K.font }}>
      {steps.map((label, i) => {
        const num = i + 1
        const isActive = num === current
        const isDone = num < current
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isActive ? K.primary : isDone ? K.primary : K.border,
                color: (isActive || isDone) ? '#ffffff' : K.fg3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                opacity: isDone ? 0.5 : 1,
              }}>
                {isDone ? '✓' : num}
              </div>
              <span style={{ fontSize: '11px', color: isActive ? K.primary : K.fg3, fontWeight: isActive ? 500 : 400 }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: '40px', height: '0.5px', background: K.border, margin: '0 4px', marginBottom: '14px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- フォームラベルコンポーネント ----
function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  const K = { fg2: '#78716C', primary: '#B91C1C', surface: '#FFFFFF' }
  return (
    <label style={{ fontSize: '14px', fontWeight: 500, color: K.fg2, display: 'block', marginBottom: '6px' }}>
      {children}
      {required && (
        <span style={{ background: K.primary, color: K.surface, fontSize: '11px', padding: '1px 5px', borderRadius: '3px', marginLeft: '5px', fontWeight: 500 }}>
          必須
        </span>
      )}
    </label>
  )
}
