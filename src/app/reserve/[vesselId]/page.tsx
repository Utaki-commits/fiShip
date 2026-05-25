'use client'

import { useEffect, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getHolidayInfo } from '@/lib/holidays'

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
  min_departure_count?: number | null
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

type AvailabilityLevel = 'available' | 'half' | 'high' | 'full'
type CalendarBinType = 'day' | 'night' | 'relay'

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
  const normalized = price.trim().replace(/,/g, '')
  if (/^\d+$/.test(normalized)) return `${Number(normalized).toLocaleString('ja-JP')}円`
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

const getTabLabel = (binType: CalendarBinType) => {
  if (binType === 'day') return '🌅 昼便'
  if (binType === 'night') return '🌙 夜便'
  return '✦ 特別便'
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

const getAvailabilityLevel = (bin: BinInfo): AvailabilityLevel => {
  if (bin.isFull || bin.isConfirmedFull || bin.actualRemaining <= 0) return 'full'
  const booked = bin.setting.max_capacity - bin.actualRemaining
  const ratio = bin.setting.max_capacity > 0 ? booked / bin.setting.max_capacity : 0
  if (ratio >= 0.8) return 'high'
  if (ratio >= 0.5) return 'half'
  return 'available'
}

const getAvailabilityColor = (bin: BinInfo) => {
  const level = getAvailabilityLevel(bin)
  if (level === 'high' || level === 'full') return '#B91C1C'
  if (level === 'half') return '#F59E0B'
  return '#1E4D3A'
}

const getCalendarMark = (bin: BinInfo) => {
  const level = getAvailabilityLevel(bin)
  if (level === 'full') return '―'
  if (level === 'half' || level === 'high') return String(bin.actualRemaining)
  return '○'
}

const hasReachedMinDeparture = (bin: BinInfo) =>
  Boolean(bin.setting.min_departure_count && (bin.setting.max_capacity - bin.actualRemaining) >= bin.setting.min_departure_count)

const getRemainingLabel = (bin: BinInfo) => {
  if (getAvailabilityLevel(bin) === 'full') return '満船'
  return `残り ${bin.actualRemaining}名`
}

const isBinActiveInMonth = (bin: BinSetting, year: number, month: number) => {
  if (bin.period_type === 'date' && bin.start_date && bin.end_date) {
    const monthStart = toDateStr(year, month, 1)
    const monthEnd = toDateStr(year, month, new Date(year, month + 1, 0).getDate())
    return bin.start_date <= monthEnd && monthStart <= bin.end_date
  }

  return bin.start_month <= bin.end_month
    ? bin.start_month <= month && month <= bin.end_month
    : month >= bin.start_month || month <= bin.end_month
}

const getCalendarTabOptions = (settings: BinSetting[], year: number, month: number): CalendarBinType[] => {
  const active = settings.filter(bin => isBinActiveInMonth(bin, year, month))
  const options: CalendarBinType[] = []
  if (active.some(bin => bin.bin_type === 'day')) options.push('day')
  if (active.some(bin => bin.bin_type === 'night')) options.push('night')
  if (active.some(bin => bin.bin_type === 'relay')) options.push('relay')
  return options
}

const getDefaultCalendarBinType = (settings: BinSetting[], year: number, month: number): CalendarBinType => {
  const active = settings.filter(bin => isBinActiveInMonth(bin, year, month))
  const dayCount = active.filter(bin => bin.bin_type === 'day').length
  const nightCount = active.filter(bin => bin.bin_type === 'night').length
  const relayCount = active.filter(bin => bin.bin_type === 'relay').length

  if (dayCount === 0 && nightCount === 0 && relayCount > 0) return 'relay'
  if (nightCount > dayCount) return 'night'
  if (dayCount > 0) return 'day'
  if (nightCount > 0) return 'night'
  return 'relay'
}

const getRepresentativeBinsByType = (bins: BinInfo[]) => {
  const map = new Map<CalendarBinType, BinInfo>()
  bins.forEach(bin => {
    const current = map.get(bin.setting.bin_type)
    if (!current || bin.actualRemaining > current.actualRemaining) {
      map.set(bin.setting.bin_type, bin)
    }
  })
  return (['day', 'night', 'relay'] as CalendarBinType[])
    .map(type => map.get(type))
    .filter((bin): bin is BinInfo => Boolean(bin))
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

const getFeatureItems = (facilities: JsonObject | null) => {
  const f = facilities || {}
  const items: { icon: string; label: string }[] = []

  const add = (enabled: boolean, icon: string, label: string) => {
    if (enabled) items.push({ icon, label })
  }

  add(hasText(f, 'parking', 'free') || hasText(f, 'parking', 'paid'), 'P', '駐車場')
  add(hasFlag(f, 'toilet'), 'WC', 'トイレ')
  add(hasText(f, 'tackle_rental', 'free') || hasText(f, 'tackle_rental', 'paid'), '竿', '道具貸出')
  add(hasFlag(f, 'life_jacket') || enabledByValue(f.life_jacket_rental), '救', '救命胴衣')
  add(hasFlag(f, 'cooler'), '冷', 'クーラー')
  add(hasFlag(f, 'live_well'), '活', '生け簀')
  add(hasFlag(f, 'electric_reel_power'), '電', '電源')
  add(hasFlag(f, 'rod_keeper'), '置', '竿受け')
  add(hasFlag(f, 'bloodletting'), '処', '血抜き')
  add(hasFlag(f, 'ike_jime'), '締', '神経締め')
  add(hasFlag(f, 'roof'), '屋', '屋根')

  return items
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
  const [calendarBinType, setCalendarBinType] = useState<CalendarBinType>('day')
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

  useEffect(() => {
    setCalendarBinType(getDefaultCalendarBinType(binSettings, calYear, calM))
  }, [binSettings, calYear, calM])

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

    const bins = getBinsForDate(year, month, day).filter(b => b.setting.bin_type === calendarBinType)
    const availableBins = bins.filter(b => !b.isFull && !b.isConfirmedFull)
    if (availableBins.length === 0) return

    setSelectedDate(dateStr)
    setSelectedBins(bins)
    setSelectedBin(availableBins.length === 1 ? availableBins[0] : null)
    setForm({ name: '', tel: '', count: 1, fishing_style: '', message: '' })
    setFormError('')
    setShowCharter(false)
    setCharter(c => ({ ...c, preferred_date: dateStr }))
    setStep(availableBins.length === 1 && bins.length === 1 ? 'form' : 'bin')
  }

  const renderCell = (year: number, month: number, day: number) => {
    const dateStr = toDateStr(year, month, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cellDate = new Date(year, month, day)
    const holiday = getHolidayInfo(cellDate)
    const isPast = cellDate < today
    const isSelected = selectedDate === dateStr
    const charterDate = isCharterDate(dateStr)
    const bins = isPast || charterDate ? [] : getBinsForDate(year, month, day).filter(b => b.setting.bin_type === calendarBinType)
    const availableBins = bins.filter(b => !b.isFull && !b.isConfirmedFull)
    const unavailable = isPast || charterDate || bins.length === 0 || availableBins.length === 0
    const cellBg = unavailable ? '#F3F4F6' : '#FFFFFF'
    const dateColor = unavailable
      ? '#D1D5DB'
      : holiday || cellDate.getDay() === 0
        ? '#B91C1C'
        : cellDate.getDay() === 6
          ? '#2563EB'
          : '#1A2420'

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
          color: unavailable ? '#D1D5DB' : '#1E4D3A',
          padding: '8px 4px',
          cursor: unavailable ? 'not-allowed' : 'pointer',
          opacity: 1,
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
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
          <div style={{ fontSize: '22px', fontWeight: 500, lineHeight: 1, color: getAvailabilityColor(availableBins[0]), marginBottom: 0 }}>
            {getCalendarMark(availableBins[0])}
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
    if (bin.isFull || bin.isConfirmedFull) return
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
  const featureItems = getFeatureItems(vessel.facilities)
  const calendarTabs = getCalendarTabOptions(binSettings, calYear, calM)

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F4F6F2', fontFamily: 'var(--font-sans)', color: '#1A2420' }}>
      <header>
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
      {step !== 'complete' && <StepIndicator step={step} />}

      <main style={{ padding: '14px 12px 24px' }}>
        {step === 'calendar' && (
          <>
            <section style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '8px 16px', marginBottom: '12px' }}>
              <div style={{ display: 'grid', gap: '8px', fontSize: '15px', color: '#5A6A78' }}>
                <div>出船場所: <span style={{ color: '#1A2420', fontWeight: 500 }}>{vessel.port_name}</span></div>
                {vessel.price && <div>料金　<span style={{ color: '#1A2420', fontWeight: 500 }}>{formatPrice(vessel.price)}</span></div>}
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
              {calendarTabs.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${calendarTabs.length}, 1fr)`, gap: '4px', background: '#F4F6F2', borderRadius: '10px', padding: '4px', marginBottom: '12px' }}>
                  {calendarTabs.map(tab => {
                    const active = tab === calendarBinType
                    return (
                      <button key={tab} type="button" onClick={() => setCalendarBinType(tab)} style={{ padding: '10px 8px', border: active ? 'none' : '0.5px solid #CDD3DC', borderRadius: '8px', background: active ? tab === 'night' ? '#6366F1' : tab === 'relay' ? '#1E4D3A' : '#1B2A4A' : '#F4F6F2', color: active ? '#FFFFFF' : '#5A6A78', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit' }}>
                        {getTabLabel(tab)}
                      </button>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '6px' }}>
                {DAY_NAMES.map((d, i) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: i === 0 ? '#B91C1C' : i === 6 ? '#2563EB' : '#1A2420' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                {renderCalendarCells()}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1E4D3A' }}><span>○</span><span>空きあり</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#B91C1C' }}><span>数字</span><span>残りわずか</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9CA3AF' }}><span>×</span><span>満席・受付不可</span></span>
              </div>
            </section>
            {featureItems.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '12px 2px 2px', marginBottom: '4px' }}>
                {featureItems.map(item => (
                  <div key={`${item.icon}-${item.label}`} style={{ minWidth: '66px', color: '#1E4D3A', textAlign: 'center' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '0.5px solid #CDD3DC', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px', fontSize: '14px', fontWeight: 500 }}>{item.icon}</div>
                    <div style={{ fontSize: '12px', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'bin' && selectedDate && (
          <section style={{ display: 'grid', gap: '12px', background: 'linear-gradient(to bottom, #E8EEF4, #F4F6F2)', margin: '-14px -12px -24px', padding: '12px', borderRadius: '12px' }}>
            <button type="button" onClick={() => setStep('calendar')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #CDD3DC', background: '#F4F6F2', color: '#1B2A4A', fontWeight: 500, fontFamily: 'inherit', textAlign: 'center' }}>← 日付を選び直す</button>
            <div style={{ fontSize: '20px', fontWeight: 500 }}>{formatDate(selectedDate)} の空き</div>
            <div style={{ display: 'grid', gap: '6px', background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '12px' }}>
              {getRepresentativeBinsByType(selectedBins).slice(0, 3).map(bin => {
                const badge = getBinBadge(bin.setting.bin_type)
                const color = getAvailabilityColor(bin)
                return (
                  <div key={`summary-${bin.setting.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ minWidth: '64px', color: badge.color, fontWeight: 500 }}>{badge.label}</span>
                    <span style={{ color, fontWeight: 500 }}>{getCalendarMark(bin)}</span>
                    <span style={{ color, fontWeight: 500 }}>{getRemainingLabel(bin)}</span>
                  </div>
                )
              })}
            </div>
            {(() => {
              const seenTypes = new Set<string>()
              const decoratedBins = selectedBins.map(bin => {
                const hasConfirmedType = bookings.some(b => b.date === selectedDate && b.bin_type === bin.setting.bin_type && b.status === 'confirmed')
                const typeAlreadySeen = seenTypes.has(bin.setting.bin_type)
                seenTypes.add(bin.setting.bin_type)
                const unavailableByConflict = hasConfirmedType && typeAlreadySeen
                const full = bin.isFull || bin.isConfirmedFull
                return {
                  bin,
                  unavailableByConflict,
                  full,
                  sort: unavailableByConflict ? 2 : full ? 1 : 0,
                }
              }).sort((a, b) => a.sort - b.sort)

              return decoratedBins.map(({ bin, unavailableByConflict, full }) => {
              const badge = getBinBadge(bin.setting.bin_type)
              const binBorderColor = getBinBorderColor(bin.setting.bin_type)
              const availabilityColor = getAvailabilityColor(bin)
              const confirmed = hasReachedMinDeparture(bin)
              const disabled = full || unavailableByConflict
              return (
              <article key={bin.setting.id} style={{ background: unavailableByConflict ? '#F9FAFB' : '#FFFFFF', border: '0.5px solid #CDD3DC', borderLeft: `4px solid ${binBorderColor}`, borderRadius: '12px', padding: '16px', opacity: unavailableByConflict ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ display: 'inline-block', background: badge.bg, color: badge.color, borderRadius: '20px', padding: '4px 10px', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>{badge.label}</span>
                    <div style={{ fontSize: '21px', fontWeight: 500 }}>{getBinName(bin.setting)}</div>
                    <div style={{ fontSize: '15px', color: '#5A6A78', marginTop: '4px' }}>{bin.setting.departure_time} 出船{bin.setting.end_time ? ` - ${bin.setting.end_time} 終了予定` : ''}</div>
                  </div>
                  <div style={{ display: 'grid', justifyItems: 'end', gap: '6px' }}>
                    {full && <span style={{ background: '#B91C1C', color: '#FFFFFF', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', fontWeight: 500 }}>満船</span>}
                    {unavailableByConflict && <span style={{ background: '#E5E7EB', color: '#6B7280', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 500 }}>受付停止</span>}
                    {!full && confirmed && <span style={{ background: '#1B2A4A', color: '#FFFFFF', borderRadius: '4px', padding: '3px 8px', fontSize: '12px', fontWeight: 500 }}>出船確定</span>}
                    {!full && <div style={{ fontSize: '18px', fontWeight: 500, color: availabilityColor }}>残り {bin.actualRemaining}名</div>}
                  </div>
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
                {!unavailableByConflict && (
                  <button type="button" disabled={disabled} onClick={() => handleSelectBin(bin)} style={{ width: '100%', padding: '14px', borderRadius: '9px', border: 'none', background: disabled ? '#CDD3DC' : '#1E4D3A', color: disabled ? '#5A6A78' : '#FFFFFF', fontSize: '17px', fontWeight: 500, fontFamily: 'inherit' }}>
                    {full ? '満船' : 'この便を予約する'}
                  </button>
                )}
              </article>
              )
              })
            })()}
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
            <button type="button" onClick={() => selectedBins.length > 1 ? setStep('bin') : setStep('calendar')} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #CDD3DC', background: '#F4F6F2', color: '#1B2A4A', fontWeight: 500, fontFamily: 'inherit', textAlign: 'center' }}>← 便を選び直す</button>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setForm(f => ({ ...f, count: f.count <= 5 ? 4 : f.count - 1 }))} style={{ width: '44px', height: '44px', background: '#F4F6F2', border: '0.5px solid #CDD3DC', borderRadius: '8px', color: '#1A2420', fontSize: '20px', fontWeight: 500, fontFamily: 'inherit' }}>−</button>
                  <div style={{ fontSize: '16px', fontWeight: 500, minWidth: '60px', textAlign: 'center', color: '#1A2420' }}>{form.count >= 5 ? form.count : 5}名</div>
                  <button type="button" disabled={(form.count >= 5 ? form.count : 5) >= maxCount} onClick={() => setForm(f => ({ ...f, count: f.count < 5 ? 5 : Math.min(maxCount, f.count + 1) }))} style={{ width: '44px', height: '44px', background: '#F4F6F2', border: '0.5px solid #CDD3DC', borderRadius: '8px', color: '#1A2420', fontSize: '20px', fontWeight: 500, fontFamily: 'inherit', opacity: (form.count >= 5 ? form.count : 5) >= maxCount ? 0.4 : 1 }}>＋</button>
                </div>
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

function StepIndicator({ step }: { step: Step }) {
  const activeIndex = step === 'calendar' ? 0 : step === 'bin' ? 1 : 2
  const labels = ['日付を選ぶ', '便を選ぶ', '予約情報入力']

  return (
    <div style={{ background: '#FFFFFF', padding: '12px 16px', borderBottom: '0.5px solid #CDD3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      {labels.map((label, index) => {
        const active = index === activeIndex
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: active ? '#1B2A4A' : '#E5E7EB', color: active ? '#FFFFFF' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500 }}>{index + 1}</span>
              {active && <span style={{ color: '#1B2A4A', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>}
            </div>
            {index < labels.length - 1 && <span style={{ color: '#CDD3DC', fontSize: '12px' }}>→</span>}
          </div>
        )
      })}
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '6px', background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
      <span style={{ fontSize: '16px', fontWeight: 500, color: '#1A2420' }}>
        {label}{required && <span style={{ background: '#B91C1C', color: '#FFFFFF', marginLeft: '6px', fontSize: '10px', padding: '2px 6px', borderRadius: '3px', verticalAlign: 'middle' }}>必須</span>}
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
