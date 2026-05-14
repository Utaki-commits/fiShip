'use client'
import { useEffect, useState } from 'react'
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

const getBinIcon = (binType: 'day' | 'night' | 'relay') =>
  binType === 'day' ? '☀️' : binType === 'relay' ? '🌅' : '🌙'

const getBinDefaultName = (binType: 'day' | 'night' | 'relay') =>
  binType === 'day' ? '昼便' : binType === 'relay' ? '昼夜便' : '夜便'

const getBinColor = (binType: 'day' | 'night' | 'relay') =>
  binType === 'day' ? 'var(--ocean)' : binType === 'relay' ? 'var(--gold)' : 'var(--status-night-fg)'

const getBinBg = (binType: 'day' | 'night' | 'relay') =>
  binType === 'day' ? 'var(--status-day-bg)' : binType === 'relay' ? 'var(--status-pending-bg)' : 'var(--status-night-bg)'

const getBinBorder = (binType: 'day' | 'night' | 'relay') =>
  binType === 'day' ? 'var(--ocean-light)' : binType === 'relay' ? 'var(--gold)' : 'var(--status-night-fg)'

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
  const [form, setForm] = useState<Form>({ name: '', tel: '', count: 1, bin_setting_id: '', bin_type: 'day', fishing_style: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState<{ isImmediate: boolean } | null>(null)
  const [formError, setFormError] = useState('')

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  useEffect(() => {
    // 予約ページは端末のカラーモード設定に従う
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.body.dataset.colormode = prefersDark ? 'dark' : 'light'
    document.body.dataset.fontsize = 'medium'

    // 端末の設定が変わったらリアルタイムで反映
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.body.dataset.colormode = e.matches ? 'dark' : 'light'
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

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
      .sort((a, b) => ['day', 'relay', 'night'].indexOf(a.bin_type) - ['day', 'relay', 'night'].indexOf(b.bin_type))
      .flatMap(bin => {
        const dateStr = toDateStr(year, month, day)
        const isBlocked = (blockedDates || []).some(b => {
          const inRange = b.date_from <= dateStr && dateStr <= b.date_to
          const binMatch = !b.bin_type || b.bin_type === bin.bin_type
          return inRange && binMatch
        })
        if (isBlocked) return []

        const confirmedUsed = bookings
          .filter(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'confirmed')
          .reduce((s, b) => s + b.count, 0)
        const pendingCount = bookings
          .filter(b => b.date === dateStr && b.bin_type === bin.bin_type && b.status === 'pending')
          .reduce((s, b) => s + b.count, 0)
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

  // 日付セルをタップしたとき
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
    // 利用可能な最初の便を初期選択
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

    setTimeout(() => {
      document.getElementById('reserve-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 電話番号バリデーション（国内番号または国際電話番号）
  const isValidTel = (tel: string): boolean => {
    const cleaned = tel.replace(/[-\s()]/g, '')
    return /^\d{10,11}$/.test(cleaned) || /^\+\d{7,15}$/.test(cleaned)
  }

  // フォーム送信
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.tel.trim()) {
      setFormError('お名前と電話番号を入力してください')
      return
    }
    if (!isValidTel(form.tel)) {
      setFormError('電話番号は国内番号または国際電話番号で入力してください')
      return
    }
    if (!selectedDate) return

    const activeBin = selectedBins.find(b => b.setting.id === form.bin_setting_id)
    if (!activeBin) return

    if (form.count > activeBin.actualRemaining) {
      setFormError(`残り${activeBin.actualRemaining}名分しか空きがありません`)
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
        .from('bookings').select('id, date, date_to, bin_type, count, status, is_charter').eq('vessel_id', vesselId).neq('status', 'rejected')
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
    const isCharterDate = bookings.some(b => {
      if (!b.is_charter || !b.date_to) return false
      return b.date <= dateStr && dateStr <= b.date_to
    })
    const isPast = cellDate < today
    const isToday = cellDate.getTime() === today.getTime()
    const isSelected = selectedDate === dateStr
    const dow = cellDate.getDay()

    const bins = isPast ? [] : getBinsForDate(year, month, day)
    const dayBin = bins.find(b => b.setting.bin_type === 'day') ?? null
    const nightBin = bins.find(b => b.setting.bin_type === 'night') ?? null
    const relayBin = bins.find(b => b.setting.bin_type === 'relay') ?? null
    const hasAvailable = bins.some(b => !b.isConfirmedFull)
    const hasPending = bookings.some(b => b.date === dateStr && b.status === 'pending')
    const hasDay = bookings.some(b => b.date === dateStr && b.bin_type === 'day' && b.status !== 'rejected') || Boolean(dayBin)
    const hasNight = bookings.some(b => b.date === dateStr && b.bin_type === 'night' && b.status !== 'rejected') || Boolean(nightBin)
    const hasRelay = bookings.some(b => b.date === dateStr && b.bin_type === 'relay' && b.status !== 'rejected') || Boolean(relayBin)
    // 祝日判定
    const holiday = getHolidayInfo(new Date(year, month, day))

    return (
      <div
        key={dateStr}
        onClick={() => {
          if (isCharterDate) return
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
          cursor: isCharterDate || isPast || (!hasAvailable && bins.length > 0) ? 'default' : bins.length === 0 ? 'default' : 'pointer',
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

        {isCharterDate && (
          <div style={{ fontSize: '10px', color: 'var(--fg-3)', fontWeight: 700,
            width: '100%', textAlign: 'center' }}>
            貸切
          </div>
        )}

        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
          {hasPending && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-pending-dot)' }} />}
          {hasDay && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ocean)' }} />}
          {hasNight && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-night-fg)' }} />}
          {hasRelay && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--gold)' }} />}
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
  const activeBinInfo = selectedBins.find(b => b.setting.id === form.bin_setting_id)
  const maxCount = activeBinInfo?.actualRemaining ?? 1
  const selectedIsCharterDate = selectedDate
    ? bookings.some(b => {
        if (!b.is_charter || !b.date_to) return false
        return b.date <= selectedDate && selectedDate <= b.date_to
      })
    : false

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '18px' }}>読み込み中...</div>
    </main>
  )

  if (!vessel) return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', margin: '0 auto 12px' }}>
          <img src={DEFAULT_ICON} alt="fiShip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
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
      <div style={{
        background: vessel.banner_url
          ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${vessel.banner_url})`
          : 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '32px 22px 48px',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
      }}>
        <div style={{ position: 'absolute', bottom: '-16px', left: 0, right: 0, height: '32px', background: 'var(--bg)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
            <img src={vessel.logo_url || DEFAULT_ICON} alt={`${vessel.name} ロゴ`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,1)' }}>{vessel.name}</div>
            <div style={{ fontSize: '18px', color: '#ffffff', marginTop: '2px', textShadow: '0 2px 8px rgba(0,0,0,1)' }}>{vessel.captain_name} 船長</div>
          </div>
        </div>
        <div style={{ fontSize: '18px', color: '#ffffff', marginBottom: '4px', textShadow: '0 2px 8px rgba(0,0,0,1)' }}>
          📍 {vessel.prefecture}・{vessel.port_name}
        </div>
        {vessel.price && (
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '6px', textShadow: '0 2px 8px rgba(0,0,0,1)' }}>{formatPrice(vessel.price)}</div>
        )}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {vessel.beginner_accepted && (
            <span style={{ background: 'rgba(0,0,0,0.45)', color: '#ffffff', fontSize: '14px', padding: '3px 10px', borderRadius: '99px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>初心者歓迎</span>
          )}
          {vessel.charter_accepted && (
            <span style={{ background: 'rgba(0,0,0,0.45)', color: '#ffffff', fontSize: '14px', padding: '3px 10px', borderRadius: '99px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>貸切OK</span>
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

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { bg: 'var(--status-day-bg)', color: 'var(--ocean)', label: '昼便' },
              { bg: 'var(--status-night-bg)', color: 'var(--status-night-fg)', label: '夜便' },
              { bg: 'var(--status-pending-bg)', color: 'var(--gold)', label: '昼夜便' },
              { bg: 'var(--status-full-bg)', color: 'var(--status-full-fg)', label: '満員' },
              { bg: 'var(--status-closed-bg)', color: 'var(--fg-3)', label: '休船日' },
            ].map(({ bg, color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: bg }} />
                <span style={{ fontSize: '14px', color, fontWeight: 700 }}>{label}</span>
              </div>
            ))}
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
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', lineHeight: 1.6 }}>
                    {selectedBins
                      .filter(b => !b.isFull)
                      .map(b => getBinDefaultName(b.setting.bin_type))
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join('・')}
                    {selectedBins.filter(b => !b.isFull).length > 0 ? '受付中' : '満員'}
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

              {selectedIsCharterDate && (
                <div style={{ background: 'var(--status-closed-bg)', border: '2px solid var(--border)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', fontSize: '16px', fontWeight: 700, color: 'var(--fg-2)', textAlign: 'center' }}>
                  ⛵ チャーター予約のため予約不可です
                </div>
              )}

              {/* 便の種類（複数便がある日のみ表示） */}
              {selectedBins.length > 1 && (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '8px' }}>便の種類</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    {selectedBins.map(b => {
                      const binColor = getBinColor(b.setting.bin_type)
                      const isActive = form.bin_setting_id === b.setting.id
                      return (
                        <button
                          key={b.setting.id}
                          onClick={() => !b.isFull && setForm(f => ({
                            ...f,
                            bin_setting_id: b.setting.id,
                            bin_type: b.setting.bin_type,
                            count: 1,
                          }))}
                          disabled={b.isFull}
                          style={{
                            padding: '14px 12px',
                            textAlign: 'left',
                            borderRadius: '10px',
                            cursor: b.isFull ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            width: '100%',
                            background: b.isFull
                              ? 'var(--bg)'
                              : getBinBg(b.setting.bin_type),
                            border: isActive
                              ? `3px solid ${binColor}`
                              : `2px solid ${getBinBorder(b.setting.bin_type)}`,
                            opacity: b.isFull ? 0.5 : 1,
                          }}
                        >
                          <div style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: b.isFull ? 'var(--fg-3)' : binColor,
                            marginBottom: '4px',
                          }}>
                            {getBinIcon(b.setting.bin_type)} {b.setting.name || getBinDefaultName(b.setting.bin_type)}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--fg-2)', lineHeight: 1.6 }}>
                            {b.isFull ? '満員' : `残り${b.remaining}名`}　{b.setting.departure_time} 出発
                          </div>
                          {b.setting.price && (
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: binColor,
                              marginTop: '4px',
                            }}>
                              💴 {b.setting.price}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {/* 単便のとき出発時刻を表示 */}
              {selectedBins.length === 1 && activeBinInfo && (
                <div style={{ background: getBinBg(activeBinInfo.setting.bin_type), borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: getBinColor(activeBinInfo.setting.bin_type) }}>
                    {getBinIcon(activeBinInfo.setting.bin_type)} {activeBinInfo.setting.name || getBinDefaultName(activeBinInfo.setting.bin_type)}　{activeBinInfo.setting.departure_time} 出発
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--fg-2)', marginTop: '2px' }}>残り {activeBinInfo.remaining}名</div>
                  {activeBinInfo.setting.price && (
                    <div style={{ fontSize: '14px', fontWeight: 700, color: getBinColor(activeBinInfo.setting.bin_type), marginTop: '4px' }}>
                      💴 {activeBinInfo.setting.price}
                    </div>
                  )}
                </div>
              )}

              {/* パターンB：承認待ちあり・確実に予約できる人数を案内 */}
              {activeBinInfo && activeBinInfo.pendingCount > 0 && activeBinInfo.actualRemaining > 0 && (
                <div style={{
                  background: 'var(--status-pending-bg)',
                  border: '2px solid var(--status-pending-dot)',
                  borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-pending-fg)', lineHeight: 1.7 }}>
                    残り{activeBinInfo.confirmedRemaining}名ですが、承認待ちの予約が{activeBinInfo.pendingCount}名分入っています。<br />
                    {activeBinInfo.actualRemaining}名以下であれば確実にご予約いただけます。
                  </div>
                </div>
              )}

              {/* パターンC：仮押さえで満員・代替日程を提案 */}
              {activeBinInfo && activeBinInfo.actualRemaining <= 0 && !activeBinInfo.isConfirmedFull && selectedDate && (
                <div style={{
                  background: 'var(--status-full-bg)',
                  border: '2px solid var(--status-full-bd)',
                  borderRadius: '10px', padding: '14px', marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-full-fg)', lineHeight: 1.7, marginBottom: '12px' }}>
                    現在満員です。承認待ちの予約が確定すると空きがなくなります。<br />
                    近い日程でご予約いただける日をご案内します。
                  </div>
                  {(() => {
                    const base = new Date(selectedDate + 'T00:00:00')
                    const suggestions: { dateStr: string; label: string; remaining: number }[] = []
                    for (let i = 1; i <= 14 && suggestions.length < 3; i++) {
                      const d = new Date(base)
                      d.setDate(base.getDate() + i)
                      const dStr = toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
                      const bins = getBinsForDate(d.getFullYear(), d.getMonth(), d.getDate())
                      const sameBin = bins.find(b => b.setting.bin_type === form.bin_type)
                      if (sameBin && sameBin.confirmedRemaining > 0) {
                        suggestions.push({
                          dateStr: dStr,
                          label: `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`,
                          remaining: sameBin.confirmedRemaining,
                        })
                      }
                    }
                    return suggestions.map(s => (
                      <button
                        key={s.dateStr}
                        onClick={() => handleDateSelect(
                          new Date(s.dateStr + 'T00:00:00').getFullYear(),
                          new Date(s.dateStr + 'T00:00:00').getMonth(),
                          new Date(s.dateStr + 'T00:00:00').getDate()
                        )}
                        style={{
                          width: '100%', padding: '12px 14px', marginBottom: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'var(--surface)', border: '2px solid var(--status-full-bd)',
                          borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-1)' }}>
                          {s.label}　残り{s.remaining}名
                        </span>
                        <span style={{ fontSize: '14px', color: 'var(--ocean)', fontWeight: 700 }}>
                          この日で予約する →
                        </span>
                      </button>
                    ))
                  })()}
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
                placeholder="例：090-1234-5678 または +1-XXX-XXXX-XXXX"
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
                ? `${vessel.name}の${(() => {
                    const d = new Date(selectedDate + 'T00:00:00')
                    return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
                  })()} ${activeBinInfo?.setting.name || getBinDefaultName(form.bin_type)}の予約が確定しました。\n当日はお気をつけてお越しください。`
                : `${(() => {
                    const d = new Date(selectedDate + 'T00:00:00')
                    return `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
                  })()} ${activeBinInfo?.setting.name || getBinDefaultName(form.bin_type)}の予約リクエストを受け付けました。\n船長が確認後、折り返しご連絡いたします。`}
            </div>
            <button
              onClick={() => { setSelectedDate(null); setCompleted(null) }}
              style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700, background: 'var(--ocean)', color: 'var(--surface)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              別の日を予約する
            </button>
          </div>
        )}

        {/* 船の詳細情報 */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>船の情報</div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {vessel.capacity && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                <span style={{ color: 'var(--fg-3)', minWidth: '80px' }}>定員</span>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{vessel.capacity}名</span>
              </div>
            )}
            {vessel.departure_time && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                <span style={{ color: 'var(--fg-3)', minWidth: '80px' }}>出船時刻</span>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{vessel.departure_time}</span>
              </div>
            )}
            {vessel.port_name && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                <span style={{ color: 'var(--fg-3)', minWidth: '80px' }}>出港場所</span>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{vessel.port_name}</span>
              </div>
            )}
            {vessel.access && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                <span style={{ color: 'var(--fg-3)', minWidth: '80px' }}>アクセス</span>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{vessel.access}</span>
              </div>
            )}
            {vessel.price && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                <span style={{ color: 'var(--fg-3)', minWidth: '80px' }}>乗船料</span>
                <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{vessel.price}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              {vessel.beginner_accepted && (
                <span style={{ fontSize: '13px', background: 'var(--status-ok-bg)', color: 'var(--status-ok-fg)', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>
                  初心者歓迎
                </span>
              )}
              {vessel.charter_accepted && (
                <span style={{ fontSize: '13px', background: 'var(--status-day-bg)', color: 'var(--ocean)', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>
                  貸切OK
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Googleマップ機能は一時停止中。再開時はこのブロックを戻す。
        {vessel.map_embed_url && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-1)' }}>📍 出港場所</div>
            </div>
            <iframe
              src={vessel.map_embed_url}
              width="100%"
              height="240"
              style={{ border: 'none', display: 'block' }}
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}
        */}

      </div>
    </div>
  )
}



