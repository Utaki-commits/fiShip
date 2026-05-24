'use client'

import { useEffect, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

type Step = 'calendar' | 'bin' | 'form' | 'complete'

type JsonObject = Record<string, unknown>

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
  facilities: JsonObject | null
  auto_confirm: boolean | null
}

type Booking = {
  id: string
  date: string
  date_to: string | null
  bin_type: string
  count: number
  status: string
  is_charter: boolean
  fishing_style: string | null
}

type BinSetting = {
  id: string
  name: string | null
  bin_type: 'day' | 'night' | 'relay'
  price: string
  start_month: number
  end_month: number
  start_date?: string | null
  end_date?: string | null
  period_type?: 'monthly' | 'date' | null
  days_of_week: number[]
  departure_time: string
  end_time?: string | null
  fish_types: string[]
  max_capacity: number
  note?: string | null
  facilities_override?: JsonObject | null
}

type BlockedDate = {
  id: string
  date_from: string
  date_to: string
  bin_type: string | null
  type: 'maintenance' | 'weather' | 'trouble' | 'other'
  reason: string
}

type BinInfo = {
  setting: BinSetting
  confirmedRemaining: number
  pendingCount: number
  actualRemaining: number
  isFull: boolean
  isConfirmedFull: boolean
  displayFacilities: string[]
  fixedFishingStyle: string | null
}

type Form = {
  name: string
  tel: string
  count: number
  fishing_style: string
  message: string
}

type CharterInquiry = {
  name: string
  tel: string
  preferred_date: string
  count: string
  message: string
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const todayStr = () => new Date().toISOString().split('T')[0]

const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
}

const formatPrice = (price: string): string => {
  if (/^\d+$/.test(price.trim())) return `${Number(price.trim()).toLocaleString('ja-JP')}円`
  return price
}

const getBinName = (bin: BinSetting) => {
  if (bin.name) return bin.name
  if (bin.bin_type === 'day') return '昼便'
  if (bin.bin_type === 'relay') return '昼夜便'
  return '夜便'
}

const getBinLabel = (binType: 'day' | 'night' | 'relay') => {
  if (binType === 'day') return '昼便'
  if (binType === 'relay') return '昼夜便'
  return '夜便'
}

const getBinBadge = (binType: 'day' | 'night' | 'relay') => {
  if (binType === 'day') return { label: '🌅 昼便', bg: '#E8F4FD', color: '#1B2A4A' }
  if (binType === 'night') return { label: '🌙 夜便', bg: '#EEF2FF', color: '#3730A3' }
  return { label: '🔄 昼夜便', bg: '#F0FDF4', color: '#1E4D3A' }
}

const getBinBorderColor = (binType: 'day' | 'night' | 'relay') => {
  if (binType === 'day') return '#F59E0B'
  if (binType === 'night') return '#6366F1'
  return '#1E4D3A'
}

const isValidTel = (tel: string): boolean => {
  const cleaned = tel.replace(/[-\s()]/g, '')
  return /^\d{10,11}$/.test(cleaned) || /^\+\d{7,15}$/.test(cleaned)
}

const hasFlag = (facilities: JsonObject, key: string) => facilities[key] === true
const hasText = (facilities: JsonObject, key: string, value: string) => facilities[key] === value
const enabledByValue = (value: unknown) =>
  value === true || (typeof value === 'string' && value !== '' && value !== 'none')

const mergeFacilities = (base: JsonObject | null, override: JsonObject | null | undefined): JsonObject => ({
  ...(base || {}),
  ...(override || {}),
})

const getDisplayFacilities = (bin: BinSetting, vesselFacilities: JsonObject | null): string[] => {
  const f = mergeFacilities(vesselFacilities, bin.facilities_override)
  const labels: string[] = []

  const add = (enabled: boolean, label: string) => {
    if (enabled) labels.push(label)
  }

  if (bin.bin_type === 'day' || bin.bin_type === 'relay') {
    add(hasFlag(f, 'casting_deck'), 'キャスティングデッキあり')
    add(hasText(f, 'tackle_rental', 'free'), 'タックル貸出あり')
    add(hasText(f, 'tackle_rental', 'paid'), 'タックル貸出あり')
    add(hasFlag(f, 'cooler'), 'クーラーボックスあり')
    add(hasFlag(f, 'bloodletting'), '血抜き対応')
    add(hasFlag(f, 'ike_jime'), '神経締め対応')
  }

  if (bin.bin_type === 'night' || bin.bin_type === 'relay') {
    add(f.searchlight_type === 'metal_halide' || f.searchlight_type === 'led' || hasFlag(f, 'metal_light'), '集魚灯あり')
    add(hasFlag(f, 'live_well'), '生け簀あり')
    add(hasFlag(f, 'water_circulation'), '海水循環あり')
  }

  add(hasFlag(f, 'electric_reel_power'), '電動リール電源あり')
  add(f.life_jacket_rental === 'free' || f.life_jacket_rental === 'paid' || hasFlag(f, 'life_jacket'), 'ライフジャケット貸出あり')
  add(hasFlag(f, 'rod_keeper'), 'ロッドキーパーあり')

  return labels.slice(0, 5)
}

const detectNeedsCall = (message: string) => {
  const keywords = ['電話', '連絡', '確認', '折り返し', '相談']
  return keywords.some(keyword => message.includes(keyword))
}

export default function ReservePage() {
  const params = useParams()
  const vesselId = params.vesselId as string

  const [step, setStep] = useState<Step>('calendar')
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
  const [selectedBin, setSelectedBin] = useState<BinInfo | null>(null)
  const [form, setForm] = useState<Form>({ name: '', tel: '', count: 1, fishing_style: '', message: '' })
  const [charter, setCharter] = useState<CharterInquiry>({ name: '', tel: '', preferred_date: '', count: '', message: '' })
  const [showCharter, setShowCharter] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [completeKind, setCompleteKind] = useState<'booking' | 'charter'>('booking')

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.body.dataset.colormode = prefersDark ? 'dark' : 'light'
    document.body.dataset.fontsize = 'medium'

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.body.dataset.colormode = e.matches ? 'dark' : 'light'
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!UUID_REGEX.test(vesselId || '')) {
        setFetchError('URLが正しくありません')
        setLoading(false)
        return
      }

      const { data: v, error: vErr } = await supabase.from('vessels').select('*').eq('id', vesselId).single()
      if (vErr || !v) {
        setFetchError('船の情報が見つかりません')
        setLoading(false)
        return
      }

      setVessel(v as Vessel)

      const [{ data: bk }, { data: bs }, { data: bd }] = await Promise.all([
        supabase.from('bookings').select('id, date, date_to, bin_type, count, status, is_charter, fishing_style').eq('vessel_id', vesselId).neq('status', 'rejected'),
        supabase.from('bin_settings').select('*').eq('vessel_id', vesselId).eq('enabled', true),
        supabase.from('blocked_dates').select('*').eq('vessel_id', vesselId),
      ])
      setBookings((bk || []) as Booking[])
      setBinSettings((bs || []) as BinSetting[])
      setBlockedDates((bd || []) as BlockedDate[])
      setLoading(false)
    }
    init()
  }, [vesselId])

  const getBinsForDate = (year: number, month: number, day: number): BinInfo[] => {
    const dateStr = toDateStr(year, month, day)
    const dow = new Date(year, month, day).getDay()

    return binSettings
      .filter(bin => {
        const inPeriod = bin.period_type === 'date' && bin.start_date && bin.end_date
          ? bin.start_date <= dateStr && dateStr <= bin.end_date
          : bin.start_month <= bin.end_month
            ? bin.start_month <= month && month <= bin.end_month
            : month >= bin.start_month || month <= bin.end_month
        return inPeriod && bin.days_of_week.map(Number).includes(dow)
      })
      .sort((a, b) => ['day', 'relay', 'night'].indexOf(a.bin_type) - ['day', 'relay', 'night'].indexOf(b.bin_type))
      .flatMap(bin => {
        const isBlocked = blockedDates.some(b => {
          const inRange = b.date_from <= dateStr && dateStr <= b.date_to
          const binMatch = !b.bin_type || b.bin_type === bin.bin_type
          return inRange && binMatch
        })
        if (isBlocked) return []

        const confirmedUsed = bookings
          .filter(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'confirmed')
          .reduce((sum, b) => sum + b.count, 0)
        const pendingUsed = bookings
          .filter(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'pending')
          .reduce((sum, b) => sum + b.count, 0)
        const fixedFishingStyle = bin.fish_types.length > 0
          ? null
          : bookings.find(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'confirmed' && b.fishing_style)?.fishing_style || null
        const confirmedRemaining = bin.max_capacity - confirmedUsed
        const actualRemaining = bin.max_capacity - confirmedUsed - pendingUsed

        return [{
          setting: bin,
          confirmedRemaining,
          pendingCount: pendingUsed,
          actualRemaining,
          isFull: actualRemaining <= 0,
          isConfirmedFull: confirmedRemaining <= 0,
          displayFacilities: getDisplayFacilities(bin, vessel?.facilities || null),
          fixedFishingStyle,
        }]
      })
  }

  const isCharterDate = (dateStr: string) =>
    bookings.some(b => b.is_charter && b.date_to && b.date <= dateStr && dateStr <= b.date_to)

  const handleDateSelect = (year: number, month: number, day: number) => {
    const dateStr = toDateStr(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (new Date(year, month, day) < today || isCharterDate(dateStr)) return

    const bins = getBinsForDate(year, month, day).filter(b => !b.isFull && !b.isConfirmedFull)
    if (bins.length === 0) return

    setSelectedDate(dateStr)
    setSelectedBins(bins)
    setSelectedBin(bins.length === 1 ? bins[0] : null)
    setForm({ name: '', tel: '', count: 1, fishing_style: '', message: '' })
    setFormError('')
    setShowCharter(false)
    setCharter(c => ({ ...c, preferred_date: dateStr }))
    setStep(bins.length === 1 ? 'form' : 'bin')
  }

  const renderCell = (year: number, month: number, day: number) => {
    const dateStr = toDateStr(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cellDate = new Date(year, month, day)
    const isPast = cellDate < today
    const isSelected = selectedDate === dateStr
    const charterDate = isCharterDate(dateStr)
    const bins = isPast || charterDate ? [] : getBinsForDate(year, month, day)
    const availableBins = bins.filter(b => !b.isFull && !b.isConfirmedFull)
    const maxRemaining = availableBins.reduce((max, b) => Math.max(max, b.actualRemaining), 0)
    const minCapacity = bins.length ? Math.min(...bins.map(b => b.setting.max_capacity)) : 0
    const lowRemaining = maxRemaining > 0 && minCapacity > 0 && maxRemaining < Math.ceil(minCapacity / 2)
    const unavailable = isPast || charterDate || bins.length === 0 || availableBins.length === 0
    const cellBg = unavailable ? '#F3F4F6' : '#FFFFFF'
    const dateColor = unavailable ? '#9CA3AF' : cellDate.getDay() === 6 ? '#1B2A4A' : '#1A2420'

    return (
      <button
        key={dateStr}
        type="button"
        onClick={() => handleDateSelect(year, month, day)}
        disabled={unavailable}
        style={{
          minHeight: '52px',
          width: '100%',
          borderRadius: '12px',
          border: isSelected ? '0.5px solid #1E4D3A' : '0.5px solid #CDD3DC',
          background: cellBg,
          color: unavailable ? '#9CA3AF' : '#1E4D3A',
          padding: '8px 4px',
          cursor: unavailable ? 'not-allowed' : 'pointer',
          opacity: 1,
          fontFamily: 'inherit',
        }}
      >
        <div style={{
          fontSize: '15px',
          fontWeight: 500,
          color: dateColor,
          marginBottom: '3px',
        }}>
          {day}
        </div>
        {!unavailable && (
          <div style={{ fontSize: '22px', fontWeight: 500, lineHeight: 1, color: '#1E4D3A', marginBottom: 0 }}>
            {lowRemaining ? maxRemaining : '○'}
          </div>
        )}
      </button>
    )
  }

  const renderCalendarCells = () => {
    const firstDow = new Date(calYear, calM, 1).getDay()
    const totalDays = new Date(calYear, calM + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(<div key={`empty-${i}`} />)
    for (let day = 1; day <= totalDays; day++) cells.push(renderCell(calYear, calM, day))
    return cells
  }

  const handleSelectBin = (bin: BinInfo) => {
    if (bin.isFull) return
    setSelectedBin(bin)
    setForm(f => ({ ...f, count: Math.min(f.count, bin.actualRemaining || 1) }))
    setFormError('')
    setStep('form')
  }

  const submitCharter = async () => {
    if (!charter.name.trim() || !charter.tel.trim() || !charter.preferred_date) {
      setFormError('お名前、電話番号、希望日を入力してください')
      return
    }
    if (charter.preferred_date < todayStr()) {
      setFormError('過去の日付は選択できません')
      return
    }
    if (!isValidTel(charter.tel)) {
      setFormError('電話番号を正しく入力してください')
      return
    }

    setSubmitting(true)
    setFormError('')
    const message = [
      `電話番号: ${charter.tel}`,
      charter.count ? `人数: ${charter.count}名` : '',
      charter.message ? `メッセージ: ${charter.message}` : '',
    ].filter(Boolean).join('\n')

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          name: charter.name.trim(),
          message,
          is_charter: true,
          preferred_date: charter.preferred_date,
        }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      setFormError('送信に失敗しました。もう一度お試しください。')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setCompleteKind('charter')
    setStep('complete')
  }

  const submitBooking = async () => {
    if (!selectedDate || !selectedBin) return
    if (!form.name.trim() || !form.tel.trim()) {
      setFormError('お名前と電話番号を入力してください')
      return
    }
    if (!isValidTel(form.tel)) {
      setFormError('電話番号を正しく入力してください')
      return
    }
    if (form.count < 1 || form.count > selectedBin.actualRemaining) {
      setFormError(`人数は1名から${selectedBin.actualRemaining}名までで選んでください`)
      return
    }
    const resolvedFishingStyle = selectedBin.setting.fish_types.length > 0
      ? null
      : selectedBin.fixedFishingStyle || form.fishing_style.trim() || null
    if (selectedBin.fixedFishingStyle && form.fishing_style.trim() && form.fishing_style.trim() !== selectedBin.fixedFishingStyle) {
      setFormError(`この便はすでに${selectedBin.fixedFishingStyle}での予約が入っています`)
      return
    }

    const needsCall = detectNeedsCall(form.message)
    const boardToken = crypto.randomUUID()
    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          date: selectedDate,
          bin_type: selectedBin.setting.bin_type,
          name: form.name.trim(),
          tel: form.tel.trim(),
          count: form.count,
          fishing_style: resolvedFishingStyle,
          message: form.message || null,
          channel: 'page',
          board_token: boardToken,
          needs_call: needsCall,
          needs_call_reason: needsCall ? form.message : '',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || '予約できませんでした。もう一度お試しください')
        return
      }

      const { data: bk } = await supabase
        .from('bookings')
        .select('id, date, date_to, bin_type, count, status, is_charter, fishing_style')
        .eq('vessel_id', vesselId)
        .neq('status', 'rejected')
      setBookings((bk || []) as Booking[])
      setCompleteKind('booking')
      setStep('complete')
    } catch {
      setFormError('通信エラーが発生しました。電波の状態を確認してください')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F4F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#1A2420', fontSize: '18px' }}>読み込み中...</div>
      </main>
    )
  }

  if (!vessel) {
    return (
      <main style={{ minHeight: '100vh', background: '#F4F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src={DEFAULT_ICON} alt="FiShip" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover', marginBottom: '12px' }} />
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#1A2420' }}>{fetchError || '船の情報が見つかりません'}</div>
        </div>
      </main>
    )
  }

  const maxCount = selectedBin?.actualRemaining || 1

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F4F6F2', fontFamily: 'var(--font-sans)', color: '#1A2420' }}>
      <header>
        <div style={{ height: '52px', background: '#1B2A4A', padding: '12px 16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="4" stroke="#FFFFFF" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="1.8" />
            <path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.9 4.9l3.5 3.5M15.6 15.6l3.5 3.5M19.1 4.9l-3.5 3.5M8.4 15.6l-3.5 3.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vessel.name}</div>
        </div>
        <div style={{
          position: 'relative',
          height: '200px',
          background: vessel.banner_url ? '#1B2A4A' : '#1B2A4A',
          overflow: 'hidden',
        }}>
          {vessel.banner_url && (
            <img src={vessel.banner_url} alt={`${vessel.name} バナー`} style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px', background: vessel.banner_url ? 'rgba(0,0,0,.5)' : 'transparent' }}>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#FFFFFF', lineHeight: 1.25 }}>{vessel.name}</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.86)', marginTop: '4px' }}>船長 {vessel.captain_name}</div>
          </div>
          <a href={`/reserve/${vesselId}/facilities`} style={{ position: 'absolute', right: '12px', bottom: '14px', background: 'rgba(0,0,0,0.5)', color: '#FFFFFF', fontSize: '12px', padding: '6px 10px', borderRadius: '4px', textDecoration: 'none' }}>
            設備を見る
          </a>
        </div>
      </header>

      <main style={{ padding: '14px 12px 24px' }}>
        {step === 'calendar' && (
          <>
            <section style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gap: '8px', fontSize: '15px', color: '#5A6A78' }}>
                <div>港: <span style={{ color: '#1A2420', fontWeight: 500 }}>{vessel.port_name}</span></div>
                {vessel.price && <div>料金: <span style={{ color: '#1A2420', fontWeight: 500 }}>{formatPrice(vessel.price)}</span></div>}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {hasText(vessel.facilities || {}, 'parking', 'free') && <span>駐車場あり</span>}
                  {hasFlag(vessel.facilities || {}, 'toilet') && <span>トイレあり</span>}
                  {(hasFlag(vessel.facilities || {}, 'life_jacket') || enabledByValue((vessel.facilities || {}).life_jacket_rental)) && <span>ライフジャケット貸出あり</span>}
                </div>
              </div>
            </section>

            <section style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button type="button" onClick={() => setCalM(m => m === 0 ? (setCalYear(y => y - 1), 11) : m - 1)} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '0.5px solid #CDD3DC', background: 'transparent', color: '#5A6A78', fontWeight: 500 }}>前月</button>
                <div style={{ fontSize: '20px', fontWeight: 500 }}>{calYear}年 {calM + 1}月</div>
                <button type="button" onClick={() => setCalM(m => m === 11 ? (setCalYear(y => y + 1), 0) : m + 1)} style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '0.5px solid #CDD3DC', background: 'transparent', color: '#5A6A78', fontWeight: 500 }}>次月</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '6px' }}>
                {DAY_NAMES.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: i === 0 ? '#1E4D3A' : i === 6 ? '#1B2A4A' : '#5A6A78' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                {renderCalendarCells()}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px', fontSize: '13px', color: '#5A6A78' }}>
                <span>○ 予約できます</span>
                <span>数字 残りわずか</span>
                <span>― 予約不可</span>
              </div>
            </section>
          </>
        )}

        {step === 'bin' && selectedDate && (
          <section style={{ display: 'grid', gap: '12px' }}>
            <button type="button" onClick={() => setStep('calendar')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #CDD3DC', background: '#F4F6F2', color: '#1B2A4A', fontWeight: 500, fontFamily: 'inherit', textAlign: 'center' }}>← 日付を選び直す</button>
            <div style={{ fontSize: '20px', fontWeight: 500 }}>{formatDate(selectedDate)} の空き</div>
            {selectedBins.map(bin => {
              const badge = getBinBadge(bin.setting.bin_type)
              const binBorderColor = getBinBorderColor(bin.setting.bin_type)
              return (
              <article key={bin.setting.id} style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderLeft: `4px solid ${binBorderColor}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ display: 'inline-block', background: badge.bg, color: badge.color, borderRadius: '20px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>{badge.label}</span>
                    <div style={{ fontSize: '21px', fontWeight: 500 }}>{getBinName(bin.setting)}</div>
                    <div style={{ fontSize: '15px', color: '#5A6A78', marginTop: '4px' }}>{bin.setting.departure_time} 出船{bin.setting.end_time ? ` - ${bin.setting.end_time} 終了予定` : ''}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 500, color: '#1E4D3A' }}>残り {bin.actualRemaining}名</div>
                </div>
                {bin.setting.note && <p style={{ fontSize: '14px', color: '#5A6A78', lineHeight: 1.7, margin: '8px 0' }}>{bin.setting.note}</p>}
                {bin.setting.fish_types.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '10px 0' }}>
                    {bin.setting.fish_types.map(fish => <span key={fish} style={{ background: '#F4F6F2', color: '#1A2420', border: '0.5px solid #CDD3DC', borderRadius: '20px', padding: '4px 9px', fontSize: '13px', fontWeight: 500 }}>🎣 {fish}</span>)}
                  </div>
                )}
                {bin.fixedFishingStyle && (
                  <div style={{ background: '#F4F6F2', color: '#1A2420', border: '0.5px solid #CDD3DC', borderRadius: '8px', padding: '10px', fontSize: '14px', margin: '10px 0' }}>
                    この便は「{bin.fixedFishingStyle}」で受付中です
                  </div>
                )}
                {bin.displayFacilities.length > 0 && (
                  <div style={{ display: 'grid', gap: '4px', margin: '10px 0 14px' }}>
                    {bin.displayFacilities.map(label => <div key={label} style={{ fontSize: '14px', color: '#1A2420' }}>・{label}</div>)}
                  </div>
                )}
                <button type="button" onClick={() => handleSelectBin(bin)} style={{ width: '100%', padding: '14px', borderRadius: '9px', border: 'none', background: '#1E4D3A', color: '#FFFFFF', fontSize: '17px', fontWeight: 500, fontFamily: 'inherit' }}>
                  この便を予約する
                </button>
              </article>
              )
            })}
            {vessel.charter_accepted && (
              <button type="button" onClick={() => setShowCharter(v => !v)} style={{ width: '100%', padding: '12px', border: '0.5px solid #CDD3DC', borderRadius: '8px', background: 'transparent', color: '#1B2A4A', fontWeight: 500, fontFamily: 'inherit', textAlign: 'center' }}>
                🚢 貸切・チャーターのご相談 {showCharter ? '▲' : '▼'}
              </button>
            )}
            {showCharter && (
              <CharterForm charter={charter} setCharter={setCharter} error={formError} submitting={submitting} onSubmit={submitCharter} />
            )}
          </section>
        )}

        {step === 'form' && selectedDate && selectedBin && (
          <section style={{ display: 'grid', gap: '12px' }}>
            <button type="button" onClick={() => selectedBins.length > 1 ? setStep('bin') : setStep('calendar')} style={{ padding: '14px', borderRadius: '9px', border: '0.5px solid #CDD3DC', background: 'transparent', color: '#5A6A78', fontWeight: 500, fontFamily: 'inherit' }}>戻る</button>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '4px' }}>予約内容</div>
              <div style={{ color: '#5A6A78', fontSize: '15px' }}>{formatDate(selectedDate)}　{getBinName(selectedBin.setting)}</div>
            </div>
            {formError && <div style={{ background: '#F4F6F2', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px', color: '#1A2420', fontWeight: 500 }}>{formError}</div>}
            <FormField label="お名前" required>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：山田 太郎" style={inputStyle} />
            </FormField>
            <FormField label="電話番号" required>
              <input type="tel" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="例：090-1234-5678" style={inputStyle} />
            </FormField>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '10px' }}>人数</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[1, 2, 3, 4].map(n => (
                  <button key={n} disabled={n > maxCount} onClick={() => setForm(f => ({ ...f, count: n }))} style={{ padding: '14px', borderRadius: '9px', border: '0.5px solid #CDD3DC', background: form.count === n ? '#1E4D3A' : '#FFFFFF', color: form.count === n ? '#FFFFFF' : '#1A2420', opacity: n > maxCount ? 0.4 : 1, fontWeight: 500, fontSize: '16px', fontFamily: 'inherit' }}>{n}名</button>
                ))}
              </div>
              {maxCount >= 5 && (
                <input type="number" min={5} max={maxCount} value={form.count >= 5 ? form.count : ''} onChange={e => setForm(f => ({ ...f, count: Math.min(maxCount, Math.max(5, Number(e.target.value) || 5)) }))} placeholder={`5名から${maxCount}名まで`} style={{ ...inputStyle, marginTop: '8px' }} />
              )}
            </div>
            {selectedBin.setting.fish_types.length === 0 && selectedBin.fixedFishingStyle && (
              <div style={{ background: '#F4F6F2', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '6px' }}>釣り方</div>
                <div style={{ fontSize: '16px', color: '#1A2420' }}>{selectedBin.fixedFishingStyle}</div>
              </div>
            )}
            {selectedBin.setting.fish_types.length === 0 && !selectedBin.fixedFishingStyle && (
              <FormField label="釣り方">
                <input value={form.fishing_style} onChange={e => setForm(f => ({ ...f, fishing_style: e.target.value }))} placeholder="例：ルアー、エサ、どちらでも" style={inputStyle} />
              </FormField>
            )}
            <FormField label="メッセージ">
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="質問や希望があれば入力してください" style={{ ...inputStyle, minHeight: '92px', resize: 'none' }} />
            </FormField>
            <button type="button" disabled={submitting} onClick={submitBooking} style={{ width: '100%', minHeight: '64px', padding: '16px', borderRadius: '9px', border: 'none', background: submitting ? '#CDD3DC' : '#1E4D3A', color: submitting ? '#5A6A78' : '#FFFFFF', fontSize: '19px', fontWeight: 500, fontFamily: 'inherit' }}>
              {submitting ? '送信中...' : '予約を申し込む'}
            </button>
            <p style={{ fontSize: '13px', color: '#5A6A78', lineHeight: 1.7, margin: 0 }}>申し込み後、船長から確認の連絡が届きます。</p>
          </section>
        )}

        {step === 'complete' && (
          <section style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '28px 16px', textAlign: 'center' }}>
            <div style={{ width: '112px', height: '112px', borderRadius: '50%', border: '0.5px solid #1E4D3A', color: '#1E4D3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', fontWeight: 500, margin: '0 auto 18px' }}>✓</div>
            {completeKind === 'charter' ? (
              <>
                <div style={{ fontSize: '20px', fontWeight: 500, color: '#1A2420', marginBottom: '10px' }}>お問い合わせを送信しました</div>
                <div style={{ fontSize: '15px', color: '#5A6A78', lineHeight: 1.8, marginBottom: '18px' }}>
                  船長より折り返しお電話いたします
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '24px', fontWeight: 500, color: '#1A2420', marginBottom: vessel.auto_confirm === false ? '14px' : '18px' }}>申し込みを受け付けました</div>
                {vessel.auto_confirm === false && (
                  <div style={{ fontSize: '15px', color: '#5A6A78', lineHeight: 1.8, marginBottom: '18px' }}>
                    船長から確認の連絡が届きます。しばらくお待ちください。
                  </div>
                )}
                <div style={{ background: '#F4F6F2', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px', textAlign: 'left', marginBottom: '18px', display: 'grid', gap: '8px' }}>
                  <SummaryRow label="日付" value={selectedDate ? formatDate(selectedDate) : charter.preferred_date ? formatDate(charter.preferred_date) : '貸切のご相談'} />
                  <SummaryRow label="便" value={selectedBin ? getBinName(selectedBin.setting) : '貸切'} />
                  <SummaryRow label="名前" value={selectedBin ? form.name : charter.name} />
                  <SummaryRow label="人数" value={selectedBin ? `${form.count}名` : charter.count ? `${charter.count}名` : '未定'} />
                </div>
              </>
            )}
            <button type="button" onClick={() => { setStep('calendar'); setSelectedDate(null); setSelectedBin(null); setSelectedBins([]) }} style={{ width: '100%', padding: '16px', borderRadius: '9px', border: 'none', background: '#1E4D3A', color: '#FFFFFF', fontSize: '17px', fontWeight: 500, fontFamily: 'inherit' }}>
              予約ホームに戻る
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '14px',
  fontSize: '17px',
  border: '0.5px solid #CDD3DC',
  borderRadius: '8px',
  background: '#FFFFFF',
  color: '#1A2420',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', fontSize: '16px' }}>
      <span style={{ color: '#5A6A78', minWidth: '48px' }}>{label}</span>
      <span style={{ color: '#1A2420', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '6px', background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
      <span style={{ fontSize: '16px', fontWeight: 500, color: '#1A2420' }}>
        {label}{required && <span style={{ color: '#1E4D3A', marginLeft: '6px', fontSize: '13px' }}>必須</span>}
      </span>
      {children}
    </label>
  )
}

function CharterForm({
  charter,
  setCharter,
  error,
  submitting,
  onSubmit,
}: {
  charter: CharterInquiry
  setCharter: Dispatch<SetStateAction<CharterInquiry>>
  error: string
  submitting: boolean
  onSubmit: () => void
}) {
  return (
    <div style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px', display: 'grid', gap: '10px' }}>
      <div style={{ fontSize: '20px', fontWeight: 500 }}>貸切のご相談</div>
      {error && <div style={{ color: '#1A2420', fontSize: '14px' }}>{error}</div>}
      <input style={inputStyle} value={charter.name} onChange={e => setCharter(c => ({ ...c, name: e.target.value }))} placeholder="お名前" />
      <input style={inputStyle} value={charter.tel} onChange={e => setCharter(c => ({ ...c, tel: e.target.value }))} placeholder="電話番号" type="tel" />
      <input style={inputStyle} value={charter.preferred_date} onChange={e => setCharter(c => ({ ...c, preferred_date: e.target.value }))} type="date" min={todayStr()} />
      <input style={inputStyle} value={charter.count} onChange={e => setCharter(c => ({ ...c, count: e.target.value }))} placeholder="人数（任意）" inputMode="numeric" />
      <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'none' }} value={charter.message} onChange={e => setCharter(c => ({ ...c, message: e.target.value }))} placeholder="ご希望があれば入力してください" />
      <button type="button" onClick={onSubmit} disabled={submitting} style={{ padding: '14px', border: 'none', borderRadius: '9px', background: submitting ? '#CDD3DC' : '#1E4D3A', color: submitting ? '#5A6A78' : '#FFFFFF', fontWeight: 500, fontSize: '16px', fontFamily: 'inherit' }}>
        {submitting ? '送信中...' : '問い合わせを送る'}
      </button>
      <div style={{ fontSize: '13px', color: '#5A6A78', lineHeight: 1.7 }}>送信後、船長より電話にてご連絡いたします。</div>
    </div>
  )
}
