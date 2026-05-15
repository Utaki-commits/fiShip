'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getHolidayInfo } from '@/lib/holidays'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

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
  date_from: string
  date_to: string
  bin_type: string | null
}

type BinInfo = {
  setting: BinSetting
  confirmedRemaining: number
  pendingCount: number
  actualRemaining: number
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

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const formatDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日（${DAY_NAMES[date.getDay()]}）`
}

const formatPrice = (price: string): string => {
  if (/^\d+$/.test(price.trim())) return `${Number(price.trim()).toLocaleString('ja-JP')}円`
  return price
}

const binName = (binType: 'day' | 'night' | 'relay') => {
  if (binType === 'day') return '昼便'
  if (binType === 'relay') return '昼夜便'
  return '夜便'
}

const binBadgeClass = (binType: 'day' | 'night' | 'relay') => {
  if (binType === 'day') return 'bg-[#DBEAFE] text-[#1E3A8A]'
  if (binType === 'relay') return 'bg-[#FEF2F2] text-[#B91C1C]'
  return 'bg-[#EDE9FE] text-[#5B21B6]'
}

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
  const [form, setForm] = useState<Form>({
    name: '',
    tel: '',
    count: 1,
    bin_setting_id: '',
    bin_type: 'day',
    fishing_style: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState<{ isImmediate: boolean } | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    document.body.dataset.colormode = 'light'
    document.body.dataset.fontsize = 'medium'
  }, [])

  useEffect(() => {
    const init = async () => {
      if (!UUID_REGEX.test(vesselId || '')) {
        setFetchError('予約リンクが正しくありません')
        setLoading(false)
        return
      }

      const { data: vesselData } = await supabase.from('vessels').select('*').eq('id', vesselId).single()
      if (!vesselData) {
        setLoading(false)
        return
      }

      setVessel(vesselData)
      const [{ data: bookingRows }, { data: binRows }, { data: blockedRows }] = await Promise.all([
        supabase.from('bookings').select('id, date, date_to, bin_type, count, status, is_charter').eq('vessel_id', vesselId).neq('status', 'rejected'),
        supabase.from('bin_settings').select('*').eq('vessel_id', vesselId).eq('enabled', true),
        supabase.from('blocked_dates').select('id, date_from, date_to, bin_type').eq('vessel_id', vesselId),
      ])
      setBookings(bookingRows || [])
      setBinSettings(binRows || [])
      setBlockedDates(blockedRows || [])
      setLoading(false)
    }
    init()
  }, [vesselId])

  const getBinsForDate = (year: number, month: number, day: number): BinInfo[] => {
    const dow = new Date(year, month, day).getDay()
    const dateStr = toDateStr(year, month, day)

    return binSettings
      .filter(bin => {
        const inPeriod = bin.start_month <= bin.end_month
          ? bin.start_month <= month && month <= bin.end_month
          : month >= bin.start_month || month <= bin.end_month
        return inPeriod && bin.days_of_week.map(Number).includes(dow)
      })
      .sort((a, b) => ['day', 'relay', 'night'].indexOf(a.bin_type) - ['day', 'relay', 'night'].indexOf(b.bin_type))
      .flatMap(bin => {
        const isBlocked = blockedDates.some(blocked => {
          const inRange = blocked.date_from <= dateStr && dateStr <= blocked.date_to
          const binMatch = !blocked.bin_type || blocked.bin_type === bin.bin_type
          return inRange && binMatch
        })
        if (isBlocked) return []

        const confirmedUsed = bookings
          .filter(booking => booking.date === dateStr && booking.bin_type === bin.bin_type && booking.status === 'confirmed')
          .reduce((sum, booking) => sum + booking.count, 0)
        const pendingCount = bookings
          .filter(booking => booking.date === dateStr && booking.bin_type === bin.bin_type && booking.status === 'pending')
          .reduce((sum, booking) => sum + booking.count, 0)
        const confirmedRemaining = bin.max_capacity - confirmedUsed
        const actualRemaining = bin.max_capacity - confirmedUsed - pendingCount

        return [{
          setting: bin,
          confirmedRemaining,
          pendingCount,
          actualRemaining,
          isFull: actualRemaining <= 0,
          isConfirmedFull: confirmedRemaining <= 0,
        }]
      })
  }

  const isCharterDate = (dateStr: string) =>
    bookings.some(booking => booking.is_charter && booking.date_to && booking.date <= dateStr && dateStr <= booking.date_to)

  const handleDateSelect = (year: number, month: number, day: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const clicked = new Date(year, month, day)
    const dateStr = toDateStr(year, month, day)
    if (clicked < today || isCharterDate(dateStr)) return

    const bins = getBinsForDate(year, month, day)
    const available = bins.filter(bin => !bin.isFull)
    if (available.length === 0) return

    const initial = available[0]
    setSelectedDate(dateStr)
    setSelectedBins(bins)
    setCompleted(null)
    setFormError('')
    setForm({
      name: '',
      tel: '',
      count: 1,
      bin_setting_id: initial.setting.id,
      bin_type: initial.setting.bin_type,
      fishing_style: '',
      message: '',
    })
  }

  const isValidTel = (tel: string) => {
    const cleaned = tel.replace(/[-\s()]/g, '')
    return /^\d{10,11}$/.test(cleaned) || /^\+\d{7,15}$/.test(cleaned)
  }

  const activeBinInfo = selectedBins.find(bin => bin.setting.id === form.bin_setting_id)
  const maxCount = activeBinInfo?.actualRemaining ?? 1

  const handleSubmit = async () => {
    if (!selectedDate || !activeBinInfo) return
    if (!form.name.trim() || !form.tel.trim()) {
      setFormError('お名前と電話番号を入力してください')
      return
    }
    if (!isValidTel(form.tel)) {
      setFormError('電話番号は国内番号または国際電話番号で入力してください')
      return
    }
    if (form.count > activeBinInfo.actualRemaining) {
      setFormError(`残り${activeBinInfo.actualRemaining}名分しか空きがありません`)
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

      setCompleted({ isImmediate: data.isImmediate })
      const { data: bookingRows } = await supabase
        .from('bookings')
        .select('id, date, date_to, bin_type, count, status, is_charter')
        .eq('vessel_id', vesselId)
        .neq('status', 'rejected')
      setBookings(bookingRows || [])
    } catch {
      setFormError('通信エラーが発生しました。電波の状態を確認してください。')
    } finally {
      setSubmitting(false)
    }
  }

  const calendarCells = useMemo(() => {
    const firstDow = new Date(calYear, calM, 1).getDay()
    const totalDays = new Date(calYear, calM + 1, 0).getDate()
    return [
      ...Array.from({ length: firstDow }, (_, index) => ({ kind: 'empty' as const, key: `empty-${index}` })),
      ...Array.from({ length: totalDays }, (_, index) => ({ kind: 'day' as const, day: index + 1, key: `day-${index + 1}` })),
    ]
  }, [calYear, calM])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F2EF] text-base font-normal text-[#57534E]">
        読み込み中...
      </main>
    )
  }

  if (!vessel) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F2EF] px-5 text-center">
        <div>
          <img src={DEFAULT_ICON} alt="fiShip" className="mx-auto mb-4 h-16 w-16 rounded-[12px] object-cover" />
          <div className="mb-2 text-lg font-medium text-[#1C1917]">{fetchError || '船の情報が見つかりません'}</div>
          <div className="text-sm font-normal text-[#57534E]">QRコードや案内リンクからアクセスしてください</div>
        </div>
      </main>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F7F2EF] pb-28 font-sans text-[#1C1917]">
      <header className="bg-[#7F1D1D] px-5 py-6 text-white">
        <div className="flex items-center gap-3">
          <img src={vessel.logo_url || DEFAULT_ICON} alt={`${vessel.name} ロゴ`} className="h-14 w-14 rounded-[12px] border-[0.5px] border-white/30 object-cover" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-medium leading-snug">{vessel.name}</h1>
            <p className="text-sm font-normal text-white/80">{vessel.captain_name} 船長</p>
          </div>
        </div>
        <div className="mt-4 text-sm font-normal text-white/85">{vessel.prefecture}・{vessel.port_name}</div>
        {vessel.price && <div className="mt-1 text-base font-medium text-white">{formatPrice(vessel.price)}</div>}
      </header>

      <main className="space-y-3 px-3 py-3">
        <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-4">
          <div className="mb-3 text-center">
            <div className="text-base font-medium text-[#1C1917]">予約する日を選んでください</div>
            <div className="text-xs font-normal text-[#57534E]">空きがある日だけ選べます</div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => {
                if (calM === 0) {
                  setCalYear(year => year - 1)
                  setCalM(11)
                } else {
                  setCalM(month => month - 1)
                }
              }}
              className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 py-[14px] text-sm font-medium text-[#57534E]"
            >
              前へ
            </button>
            <div className="text-lg font-medium text-[#1C1917]">{calYear}年 {calM + 1}月</div>
            <button
              onClick={() => {
                if (calM === 11) {
                  setCalYear(year => year + 1)
                  setCalM(0)
                } else {
                  setCalM(month => month + 1)
                }
              }}
              className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 py-[14px] text-sm font-medium text-[#57534E]"
            >
              次へ
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#57534E]">
            {DAY_NAMES.map(day => <div key={day} className="py-1">{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map(cell => {
              if (cell.kind === 'empty') return <div key={cell.key} className="min-h-14" />
              const dateStr = toDateStr(calYear, calM, cell.day)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const cellDate = new Date(calYear, calM, cell.day)
              const isPast = cellDate < today
              const bins = isPast ? [] : getBinsForDate(calYear, calM, cell.day)
              const availableBins = bins.filter(bin => !bin.isFull)
              const holiday = getHolidayInfo(cellDate)
              const selected = selectedDate === dateStr
              const blockedByCharter = isCharterDate(dateStr)

              return (
                <button
                  key={cell.key}
                  onClick={() => handleDateSelect(calYear, calM, cell.day)}
                  disabled={isPast || availableBins.length === 0 || blockedByCharter}
                  className={`min-h-14 rounded-[8px] border-[0.5px] px-1 py-2 text-center text-sm font-medium ${
                    selected
                      ? 'border-[#B91C1C] bg-[#FEF2F2] text-[#B91C1C]'
                      : availableBins.length > 0 && !blockedByCharter
                        ? 'border-[#E8DDD8] bg-white text-[#1C1917]'
                        : 'border-[#E8DDD8] bg-[#F7F2EF] text-[#A8A29E]'
                  }`}
                >
                  <span>{cell.day}</span>
                  {holiday && <span className="block truncate text-[10px] font-normal text-[#B91C1C]">{holiday.name}</span>}
                  {blockedByCharter && <span className="block text-[10px] font-normal text-[#57534E]">貸切</span>}
                  {availableBins.length > 0 && !blockedByCharter && <span className="block text-[10px] font-normal text-[#059669]">空き</span>}
                </button>
              )
            })}
          </div>
        </section>

        {selectedDate && !completed && (
          <section id="reserve-form" className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-4">
            <div className="mb-4">
              <div className="text-lg font-medium text-[#1C1917]">{formatDate(selectedDate)}</div>
              <div className="text-sm font-normal text-[#57534E]">予約内容を入力してください</div>
            </div>

            {formError && (
              <div className="mb-4 rounded-[12px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm font-medium text-[#B91C1C]">
                {formError}
              </div>
            )}

            <div className="mb-4 grid gap-2">
              {selectedBins.map(bin => (
                <button
                  key={bin.setting.id}
                  onClick={() => setForm(prev => ({
                    ...prev,
                    bin_setting_id: bin.setting.id,
                    bin_type: bin.setting.bin_type,
                    count: 1,
                  }))}
                  disabled={bin.isFull}
                  className={`min-h-0 rounded-[12px] border-[0.5px] px-4 py-[14px] text-left ${
                    form.bin_setting_id === bin.setting.id
                      ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                      : 'border-[#E8DDD8] bg-white'
                  }`}
                >
                  <span className={`mr-2 rounded-[20px] px-3 py-1 text-xs font-medium ${binBadgeClass(bin.setting.bin_type)}`}>
                    {bin.setting.name || binName(bin.setting.bin_type)}
                  </span>
                  <span className="text-sm font-normal text-[#57534E]">
                    {bin.isFull ? '満員' : `残り${bin.actualRemaining}名`}・{bin.setting.departure_time}出発
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#57534E]">お名前</span>
                <input
                  value={form.name}
                  onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="例：山田 太郎"
                  className="min-h-0 w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-base font-normal text-[#1C1917] outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#57534E]">電話番号</span>
                <input
                  value={form.tel}
                  onChange={event => setForm(prev => ({ ...prev, tel: event.target.value }))}
                  placeholder="例：090-1234-5678 または +1-XXX-XXXX-XXXX"
                  type="tel"
                  className="min-h-0 w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-base font-normal text-[#1C1917] outline-none"
                />
              </label>

              <div>
                <span className="mb-1 block text-sm font-medium text-[#57534E]">人数</span>
                <div className="flex items-center justify-between rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-[#F7F2EF] p-3">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, count: Math.max(1, prev.count - 1) }))}
                    className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-5 py-[14px] text-base font-medium text-[#57534E]"
                  >
                    －
                  </button>
                  <div className="text-xl font-medium text-[#1C1917]">{form.count}名</div>
                  <button
                    onClick={() => setForm(prev => ({ ...prev, count: Math.min(maxCount, prev.count + 1) }))}
                    className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-5 py-[14px] text-base font-medium text-[#57534E]"
                  >
                    ＋
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#57534E]">釣り方（任意）</span>
                <input
                  value={form.fishing_style}
                  onChange={event => setForm(prev => ({ ...prev, fishing_style: event.target.value }))}
                  placeholder="例：泳がせ、一つテンヤ"
                  className="min-h-0 w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-base font-normal text-[#1C1917] outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#57534E]">一言メッセージ（任意）</span>
                <textarea
                  value={form.message}
                  onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))}
                  placeholder="質問・ご要望があればどうぞ"
                  className="min-h-24 w-full resize-none rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-base font-normal text-[#1C1917] outline-none"
                />
              </label>
            </div>
          </section>
        )}

        {completed && (
          <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-5 text-center">
            <div className="mb-2 text-xl font-medium text-[#1C1917]">
              {completed.isImmediate ? '予約が完了しました' : '予約リクエストを受け付けました'}
            </div>
            <p className="mb-4 text-sm font-normal leading-7 text-[#57534E]">
              {completed.isImmediate ? '当日はお気をつけてお越しください。' : '船長が確認後、折り返しご連絡いたします。'}
            </p>
            <button
              onClick={() => { setSelectedDate(null); setCompleted(null) }}
              className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 py-[14px] text-sm font-medium text-[#57534E]"
            >
              別の日を予約する
            </button>
          </section>
        )}

        <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-4">
          <div className="mb-3 text-base font-medium text-[#1C1917]">船の情報</div>
          <div className="grid gap-2 text-sm font-normal text-[#57534E]">
            {vessel.capacity ? <div><span className="text-[#1C1917]">定員</span> {vessel.capacity}名</div> : null}
            {vessel.departure_time ? <div><span className="text-[#1C1917]">出船時刻</span> {vessel.departure_time}</div> : null}
            {vessel.port_name ? <div><span className="text-[#1C1917]">出港場所</span> {vessel.port_name}</div> : null}
            {vessel.access ? <div><span className="text-[#1C1917]">アクセス</span> {vessel.access}</div> : null}
            {vessel.beginner_accepted ? <div>初心者歓迎</div> : null}
            {vessel.charter_accepted ? <div>貸切OK</div> : null}
          </div>
        </section>
      </main>

      {selectedDate && !completed && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t-[0.5px] border-[#E8DDD8] bg-white p-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-0 w-full rounded-[9px] bg-[#B91C1C] px-4 py-[14px] text-base font-medium text-white disabled:bg-[#E8DDD8] disabled:text-[#A8A29E]"
          >
            {submitting ? '送信中...' : '予約リクエストを送る'}
          </button>
        </div>
      )}
    </div>
  )
}
