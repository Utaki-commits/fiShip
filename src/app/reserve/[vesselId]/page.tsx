'use client'

import { useEffect, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

const cn = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ')

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
  const router = useRouter()
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
  const [completedImmediate, setCompletedImmediate] = useState(false)

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
        supabase.from('bookings').select('id, date, date_to, bin_type, count, status, is_charter').eq('vessel_id', vesselId).neq('status', 'rejected'),
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
    const holiday = getHolidayInfo(cellDate)
    const bins = isPast || charterDate ? [] : getBinsForDate(year, month, day)
    const availableBins = bins.filter(b => !b.isFull && !b.isConfirmedFull)
    const maxRemaining = availableBins.reduce((max, b) => Math.max(max, b.actualRemaining), 0)
    const minCapacity = bins.length ? Math.min(...bins.map(b => b.setting.max_capacity)) : 0
    const lowRemaining = maxRemaining > 0 && minCapacity > 0 && maxRemaining < Math.ceil(minCapacity / 2)
    const unavailable = isPast || charterDate || bins.length === 0 || availableBins.length === 0

    let mark = '×'
    let label = '予約不可'
    let bg = '#F1F5F9'
    let color = '#57534E'
    let borderColor = '#E8DDD8'

    if (isPast) {
      bg = '#F1F5F9'
      label = '過去日'
    } else if (!unavailable && lowRemaining) {
      mark = String(maxRemaining)
      label = '残りわずか'
      bg = '#FEF2F2'
      color = '#B91C1C'
      borderColor = '#FCA5A5'
    } else if (!unavailable) {
      mark = '○'
      label = '空きあり'
      bg = '#FFFFFF'
      color = '#059669'
      borderColor = '#D6CCC7'
    }

    return (
      <button
        key={dateStr}
        type="button"
        onClick={() => handleDateSelect(year, month, day)}
        disabled={unavailable}
        className={cn(
          'min-h-[74px] rounded-xl px-1.5 py-2 text-center transition-colors',
          'border-[0.5px] font-medium',
          unavailable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.99]',
          isSelected && 'ring-1 ring-[#B91C1C]',
        )}
        style={{ background: bg, color, borderColor, fontFamily: 'inherit' }}
      >
        <div
          className="mb-1 text-[15px] font-medium leading-none"
          style={{ color: (holiday || cellDate.getDay() === 0) ? '#B91C1C' : cellDate.getDay() === 6 ? '#1E3A8A' : '#1C1917' }}
        >
          {day}
        </div>
        <div className="text-[23px] font-medium leading-none">
          {mark}
        </div>
        <div className="mt-1 truncate text-[10px] font-normal leading-tight text-[#57534E]">
          {charterDate ? '貸切' : holiday ? holiday.name.slice(0, 4) : label}
        </div>
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

    const { error } = await supabase.from('contacts').insert([{
      vessel_id: vesselId,
      name: charter.name.trim(),
      message,
      is_charter: true,
      preferred_date: charter.preferred_date,
    }])
    setSubmitting(false)

    if (error) {
      setFormError('送信できませんでした。時間をおいてもう一度お試しください')
      return
    }

    setCompletedImmediate(false)
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
          fishing_style: form.fishing_style || null,
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
        .select('id, date, date_to, bin_type, count, status, is_charter')
        .eq('vessel_id', vesselId)
        .neq('status', 'rejected')
      setBookings((bk || []) as Booking[])
      setCompletedImmediate(Boolean(data.isImmediate))
      setStep('complete')
    } catch {
      setFormError('通信エラーが発生しました。電波の状態を確認してください')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F2EF] px-5 font-sans text-[#1C1917]">
        <div className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white px-5 py-4 text-[16px] font-medium">
          読み込み中...
        </div>
      </main>
    )
  }

  if (!vessel) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F2EF] px-5 font-sans text-[#1C1917]">
        <div className="text-center">
          <img src={DEFAULT_ICON} alt="FiShip" className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover" />
          <div className="text-[18px] font-medium">{fetchError || '船の情報が見つかりません'}</div>
        </div>
      </main>
    )
  }

  const maxCount = selectedBin?.actualRemaining || 1

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F7F2EF] font-sans text-[#1C1917]">
      <header className="relative overflow-hidden bg-[#7F1D1D] px-4 pb-5 pt-5 text-white">
        {vessel.banner_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${vessel.banner_url})` }}
          />
        )}
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full border-[0.5px] border-white/15" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full border-[0.5px] border-white/10" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <img src={vessel.logo_url || DEFAULT_ICON} alt={`${vessel.name} ロゴ`} className="h-14 w-14 rounded-xl object-cover" />
            <div className="min-w-0">
              <h1 className="m-0 truncate text-[24px] font-medium leading-tight">{vessel.name}</h1>
              <div className="mt-1 text-[15px] font-normal text-white/85">{vessel.captain_name} 船長</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border-[0.5px] border-white/20 bg-white/10 p-2 text-center">
            {[
              { key: 'calendar', label: '日付' },
              { key: 'bin', label: '便' },
              { key: 'form', label: '予約' },
            ].map(item => (
              <div
                key={item.key}
                className={cn(
                  'rounded-lg px-2 py-2 text-[13px] font-medium',
                  step === item.key || (step === 'complete' && item.key === 'form') ? 'bg-white text-[#7F1D1D]' : 'text-white/70',
                )}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="px-3 py-3">
        {step === 'calendar' && (
          <div className="space-y-3">
            <section className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-normal text-[#57534E]">出船場所</div>
                  <div className="mt-0.5 text-[18px] font-medium">{vessel.port_name || vessel.prefecture}</div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/reserve/${vesselId}/facilities`)}
                  className="min-h-[44px] rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] px-4 text-[14px] font-medium text-[#B91C1C]"
                >
                  設備
                </button>
              </div>
              <div className="grid gap-2 text-[14px] font-normal text-[#57534E]">
                {vessel.price && (
                  <div className="flex justify-between gap-3 border-t-[0.5px] border-[#E8DDD8] pt-2">
                    <span>乗船料</span>
                    <span className="font-medium text-[#1C1917]">{formatPrice(vessel.price)}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {vessel.beginner_accepted && <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[12px] font-medium text-[#059669]">初心者歓迎</span>}
                  {vessel.charter_accepted && <span className="rounded-full bg-[#FEF2F2] px-3 py-1 text-[12px] font-medium text-[#B91C1C]">貸切相談可</span>}
                  {hasText(vessel.facilities || {}, 'parking', 'free') && <span className="rounded-full bg-[#F7F2EF] px-3 py-1 text-[12px] font-medium text-[#57534E]">駐車場あり</span>}
                  {hasFlag(vessel.facilities || {}, 'toilet') && <span className="rounded-full bg-[#F7F2EF] px-3 py-1 text-[12px] font-medium text-[#57534E]">トイレあり</span>}
                </div>
              </div>
            </section>

            <section className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalM(m => m === 0 ? (setCalYear(y => y - 1), 11) : m - 1)}
                  className="min-h-[44px] rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 text-[14px] font-medium text-[#57534E]"
                >
                  前月
                </button>
                <div className="text-center">
                  <div className="text-[20px] font-medium">{calYear}年 {calM + 1}月</div>
                  <div className="text-[12px] font-normal text-[#57534E]">空いている日を選んでください</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCalM(m => m === 11 ? (setCalYear(y => y + 1), 0) : m + 1)}
                  className="min-h-[44px] rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 text-[14px] font-medium text-[#57534E]"
                >
                  次月
                </button>
              </div>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAY_NAMES.map((d, i) => (
                  <div key={d} className="text-center text-[12px] font-medium" style={{ color: i === 0 ? '#B91C1C' : i === 6 ? '#1E3A8A' : '#57534E' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarCells()}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] font-normal text-[#57534E]">
                <div className="rounded-lg bg-[#ECFDF5] py-2 text-[#059669]">○ 空き</div>
                <div className="rounded-lg bg-[#FEF2F2] py-2 text-[#B91C1C]">数字 残り少</div>
                <div className="rounded-lg bg-[#F1F5F9] py-2">× 不可</div>
              </div>
            </section>
          </div>
        )}

        {step === 'bin' && selectedDate && (
          <section className="space-y-3 pb-4">
            <button type="button" onClick={() => setStep('calendar')} className="min-h-[52px] w-full rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 text-[16px] font-medium text-[#57534E]">日付を選び直す</button>
            <div className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
              <div className="text-[13px] font-normal text-[#57534E]">選択中の日付</div>
              <div className="text-[22px] font-medium">{formatDate(selectedDate)}</div>
            </div>
            {selectedBins.map(bin => (
              <article key={bin.setting.id} className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
                <div className="mb-3 flex justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: bin.setting.bin_type === 'night' ? '#EDE9FE' : bin.setting.bin_type === 'relay' ? '#FEF2F2' : '#DBEAFE', color: bin.setting.bin_type === 'night' ? '#5B21B6' : bin.setting.bin_type === 'relay' ? '#B91C1C' : '#1E3A8A' }}>{getBinLabel(bin.setting.bin_type)}</div>
                    <div className="text-[22px] font-medium leading-tight">{getBinName(bin.setting)}</div>
                    <div className="mt-1 text-[14px] font-normal text-[#57534E]">{bin.setting.departure_time} 出船{bin.setting.end_time ? ` - ${bin.setting.end_time} 終了予定` : ''}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[12px] font-normal text-[#57534E]">空席</div>
                    <div className="text-[24px] font-medium leading-none" style={{ color: bin.actualRemaining <= 2 ? '#B91C1C' : '#059669' }}>{bin.actualRemaining}</div>
                  </div>
                </div>
                {bin.setting.price && <div className="mb-2 text-[15px] font-medium text-[#1C1917]">{formatPrice(bin.setting.price)}</div>}
                {bin.setting.note && <p className="my-2 text-[14px] font-normal leading-[1.7] text-[#57534E]">{bin.setting.note}</p>}
                {bin.displayFacilities.length > 0 && (
                  <div className="mb-4 mt-3 flex flex-wrap gap-2">
                    {bin.displayFacilities.map(label => <span key={label} className="rounded-full bg-[#F7F2EF] px-3 py-1 text-[12px] font-medium text-[#57534E]">{label}</span>)}
                  </div>
                )}
                <button type="button" onClick={() => handleSelectBin(bin)} className="min-h-[56px] w-full rounded-[9px] border-none bg-[#B91C1C] px-4 py-[14px] text-[17px] font-medium text-white">
                  この便を予約する
                </button>
              </article>
            ))}
            {vessel.charter_accepted && (
              <button type="button" onClick={() => setShowCharter(v => !v)} className="min-h-[56px] w-full rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] px-4 py-[14px] text-[16px] font-medium text-[#B91C1C]">
                貸切でのご利用はこちら
              </button>
            )}
            {showCharter && (
              <CharterForm charter={charter} setCharter={setCharter} error={formError} submitting={submitting} onSubmit={submitCharter} />
            )}
          </section>
        )}

        {step === 'form' && selectedDate && selectedBin && (
          <section className="space-y-3 pb-[96px]">
            <button type="button" onClick={() => selectedBins.length > 1 ? setStep('bin') : setStep('calendar')} className="min-h-[52px] w-full rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 text-[16px] font-medium text-[#57534E]">戻る</button>
            <div className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
              <div className="mb-1 text-[18px] font-medium">予約内容</div>
              <div className="text-[15px] font-normal text-[#57534E]">{formatDate(selectedDate)}　{getBinName(selectedBin.setting)}</div>
              <div className="mt-2 inline-flex rounded-full bg-[#ECFDF5] px-3 py-1 text-[13px] font-medium text-[#059669]">残り {selectedBin.actualRemaining}席</div>
            </div>
            {formError && <div className="rounded-xl border-[0.5px] border-[#FCA5A5] bg-[#FEE2E2] p-4 text-[15px] font-medium text-[#B91C1C]">{formError}</div>}
            <FormField label="お名前" required>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：山田 太郎" style={inputStyle} />
            </FormField>
            <FormField label="電話番号" required>
              <input type="tel" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="例：090-1234-5678" style={inputStyle} />
            </FormField>
            <div className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
              <div className="mb-3 text-[16px] font-medium">人数</div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} disabled={n > maxCount} onClick={() => setForm(f => ({ ...f, count: n }))} className="min-h-[52px] rounded-[9px] border-[0.5px] px-2 text-[16px] font-medium disabled:opacity-40" style={{ borderColor: '#E8DDD8', background: form.count === n ? '#B91C1C' : '#FFFFFF', color: form.count === n ? '#FFFFFF' : '#1C1917' }}>{n}名</button>
                ))}
              </div>
              {maxCount >= 5 && (
                <input type="number" min={5} max={maxCount} value={form.count >= 5 ? form.count : ''} onChange={e => setForm(f => ({ ...f, count: Math.min(maxCount, Math.max(5, Number(e.target.value) || 5)) }))} placeholder={`5名から${maxCount}名まで`} style={{ ...inputStyle, marginTop: '8px' }} />
              )}
            </div>
            {selectedBin.setting.fish_types.length === 0 && (
              <FormField label="釣り方">
                <input value={form.fishing_style} onChange={e => setForm(f => ({ ...f, fishing_style: e.target.value }))} placeholder="例：ルアー、エサ、どちらでも" style={inputStyle} />
              </FormField>
            )}
            <FormField label="メッセージ">
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="質問や希望があれば入力してください" style={{ ...inputStyle, minHeight: '92px', resize: 'none' }} />
            </FormField>
            <p style={{ fontSize: '13px', color: '#57534E', lineHeight: 1.7, margin: 0 }}>申し込み後、船長から確認の連絡が届きます。</p>
            <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[480px] border-t-[0.5px] border-[#E8DDD8] bg-white/95 px-3 py-3">
              <button type="button" disabled={submitting} onClick={submitBooking} className="min-h-[64px] w-full rounded-[9px] border-none px-4 py-4 text-[19px] font-medium" style={{ background: submitting ? '#E8DDD8' : '#B91C1C', color: submitting ? '#57534E' : '#FFFFFF' }}>
                {submitting ? '送信中...' : '予約を申し込む'}
              </button>
            </div>
          </section>
        )}

        {step === 'complete' && (
          <section className="rounded-xl border-[0.5px] border-[#E8DDD8] bg-white px-4 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5] text-[30px] font-medium text-[#059669]">✓</div>
            <div className="mb-3 text-[26px] font-medium leading-tight text-[#059669]">申し込みを受け付けました</div>
            <div className="mb-5 text-[16px] font-normal leading-[1.8] text-[#57534E]">
              {selectedDate && selectedBin ? `${formatDate(selectedDate)} ${getBinName(selectedBin.setting)}` : '貸切のご相談'}<br />
              船長から確認の連絡が届きます。しばらくお待ちください。
            </div>
            <button type="button" onClick={() => { setStep('calendar'); setSelectedDate(null); setSelectedBin(null); setSelectedBins([]); setCompletedImmediate(false) }} className="min-h-[52px] rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-6 py-[14px] text-[16px] font-medium text-[#57534E]">
              別の日を探す
            </button>
            {completedImmediate && <div className="mt-3 text-[13px] font-normal text-[#059669]">この予約は自動で承認されました。</div>}
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
  border: '0.5px solid #E8DDD8',
  borderRadius: '8px',
  background: '#FFFFFF',
  color: '#1C1917',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-[14px]">
      <div className="text-[16px] font-medium text-[#1C1917]">
        {label}{required && <span style={{ color: '#B91C1C', marginLeft: '6px', fontSize: '13px' }}>必須</span>}
      </div>
      {children}
    </div>
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
    <div className="grid gap-3 rounded-xl border-[0.5px] border-[#E8DDD8] bg-white p-4">
      <div className="text-[20px] font-medium">貸切のご相談</div>
      {error && <div className="rounded-lg bg-[#FEE2E2] px-3 py-2 text-[14px] font-medium text-[#B91C1C]">{error}</div>}
      <input style={inputStyle} value={charter.name} onChange={e => setCharter(c => ({ ...c, name: e.target.value }))} placeholder="お名前" />
      <input style={inputStyle} value={charter.tel} onChange={e => setCharter(c => ({ ...c, tel: e.target.value }))} placeholder="電話番号" type="tel" />
      <input style={inputStyle} value={charter.preferred_date} onChange={e => setCharter(c => ({ ...c, preferred_date: e.target.value }))} type="date" />
      <input style={inputStyle} value={charter.count} onChange={e => setCharter(c => ({ ...c, count: e.target.value }))} placeholder="人数（任意）" inputMode="numeric" />
      <textarea style={{ ...inputStyle, minHeight: '90px', resize: 'none' }} value={charter.message} onChange={e => setCharter(c => ({ ...c, message: e.target.value }))} placeholder="ご希望があれば入力してください" />
      <button type="button" onClick={onSubmit} disabled={submitting} className="min-h-[56px] rounded-[9px] border-none px-4 py-[14px] text-[16px] font-medium" style={{ background: submitting ? '#E8DDD8' : '#B91C1C', color: submitting ? '#57534E' : '#FFFFFF' }}>
        {submitting ? '送信中...' : '問い合わせを送る'}
      </button>
      <div className="text-[13px] font-normal leading-[1.7] text-[#57534E]">送信後、船長より電話にてご連絡いたします。</div>
    </div>
  )
}
