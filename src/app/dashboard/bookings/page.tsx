'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getHolidayInfo } from '@/lib/holidays'

type Vessel = {
  id: string
  name: string
  captain_name: string
}

type BinType = 'day' | 'night' | 'relay'

type Booking = {
  id: string
  date: string
  date_to: string | null
  bin_type: BinType
  name: string
  tel: string
  count: number
  fishing_style: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  channel: string
  contacted: boolean
  is_charter: boolean
}

type BinSetting = {
  id: string
  vessel_id: string
  bin_type: BinType
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  fish_types: string[]
  max_capacity: number
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES = ['日','月','火','水','木','金','土']

type BookingCandidate = {
  id: string
  channel: 'line_official' | 'instagram' | 'line' | 'phone' | 'other'
  raw_message: string
  parsed_date: string | null
  parsed_bin_type: string | null
  parsed_name: string | null
  parsed_tel: string | null
  parsed_count: number | null
  parsed_note: string | null
  status: 'pending' | 'approved' | 'ignored'
  created_at: string
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const getWeekSunday = (d: Date) => {
  const sun = new Date(d)
  sun.setDate(d.getDate() - d.getDay())
  sun.setHours(0, 0, 0, 0)
  return sun
}

export default function DashboardBookingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekSunday(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<BookingCandidate[]>([])
  const [inputChannel, setInputChannel] = useState<'line' | 'phone' | 'other'>('line')
  const [inputMessage, setInputMessage] = useState('')
  const [inputDate, setInputDate] = useState('')
  const [inputBinType, setInputBinType] = useState<'day' | 'night' | ''>('')
  const [inputCount, setInputCount] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState({
    date: '',
    bin_type: 'day' as BinType,
    name: '',
    tel: '',
    count: 1,
    message: '',
  })

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      if (!res.ok) { router.push('/login'); return }

      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }

      const { data: v } = await supabase
        .from('vessels')
        .select('id, name, captain_name')
        .eq('user_id', user.sub)
        .single()
      if (!v) { router.push('/register'); return }
      setVessel(v)

      const [{ data: bk }, { data: bs }, { data: cd }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', v.id).order('date', { ascending: true }),
        supabase.from('bin_settings').select('*').eq('vessel_id', v.id),
        supabase.from('booking_candidates').select('*').eq('vessel_id', v.id).eq('status', 'pending').order('created_at', { ascending: false }),
      ])
      setBookings(bk || [])
      setBinSettings(bs || [])
      setCandidates(cd || [])
      setLoading(false)
    }
    init()
  }, [router])

  const normalizeBinType = (value: unknown): BinType | null => {
    if (value === 'day' || value === '昼' || value === '昼便') return 'day'
    if (value === 'night' || value === '夜' || value === '夜便') return 'night'
    if (value === 'relay' || value === '昼夜' || value === '昼夜便') return 'relay'
    const text = typeof value === 'string' ? value.toLowerCase() : ''
    if (text.includes('relay') || text.includes('昼夜')) return 'relay'
    if (text.includes('night') || text.includes('夜') || text.includes('螟')) return 'night'
    if (text.includes('day') || text.includes('昼') || text.includes('譏')) return 'day'
    return null
  }

  const handleAnalyzeAndRegister = async () => {
    if (!vessel?.id || (!inputMessage.trim() && !inputDate && !inputBinType && !inputCount)) return

    setAnalyzing(true)
    try {
      let parsed: {
        date?: string | null
        bin_type?: string | null
        bin_preference?: string | null
        name?: string | null
        tel?: string | null
        count?: number | null
        note?: string | null
        fishing_style?: string | null
      } = {}

      if (inputMessage.trim()) {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputMessage,
            vessel_id: vessel.id,
            channel: inputChannel,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          parsed = data.extracted || {}
        }
      }

      const finalDate = inputDate || parsed.date || null
      const finalBinType = inputBinType || normalizeBinType(parsed.bin_type || parsed.bin_preference)
      const finalCount = inputCount || parsed.count || 1

      const { data: candidate } = await supabase
        .from('booking_candidates')
        .insert([{
          vessel_id: vessel.id,
          channel: inputChannel,
          raw_message: inputMessage,
          parsed_date: finalDate,
          parsed_bin_type: finalBinType,
          parsed_name: parsed.name || null,
          parsed_tel: parsed.tel || null,
          parsed_count: finalCount,
          parsed_note: parsed.note || parsed.fishing_style || null,
          status: 'pending',
        }])
        .select()
        .single()

      if (candidate) {
        setCandidates(prev => [candidate, ...prev])
      }

      setInputMessage('')
      setInputDate('')
      setInputBinType('')
      setInputCount(0)
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApproveCandidate = async (c: BookingCandidate) => {
    if (!c.parsed_date || !c.parsed_bin_type || !vessel?.id) return

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vessel_id: vessel.id,
        date: c.parsed_date,
        bin_type: c.parsed_bin_type,
        name: c.parsed_name || '名前不明',
        tel: c.parsed_tel || '',
        count: c.parsed_count || 1,
        message: c.parsed_note || '',
        channel: c.channel,
      }),
    })
    if (!res.ok) return

    const data = await res.json()
    const booking = data.booking as Booking | undefined
    if (booking) {
      const normalized = { ...booking, status: 'confirmed' as const }
      if (booking.status !== 'confirmed') {
        await updateBooking(booking.id, { status: 'confirmed' })
      }
      setBookings(prev => [normalized, ...prev.filter(b => b.id !== booking.id)])
    }

    await supabase.from('booking_candidates').update({ status: 'approved' }).eq('id', c.id)
    setCandidates(prev => prev.filter(cd => cd.id !== c.id))
  }

  const handleIgnoreCandidate = async (id: string) => {
    await supabase.from('booking_candidates').update({ status: 'ignored' }).eq('id', id)
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  const updateBooking = async (id: string, patch: { status?: 'confirmed' | 'rejected' | 'cancelled'; contacted?: boolean }) => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleCall = async (booking: Booking) => {
    window.location.href = `tel:${booking.tel}`
    await updateBooking(booking.id, { contacted: true })
  }

  const updateStatus = (id: string, status: 'confirmed' | 'rejected') => {
    updateBooking(id, { status })
  }

  const handleDelete = async (booking: Booking, addBlockedDate: boolean) => {
    if (!vessel?.id) return
    setDeleting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id }),
      })
      if (!res.ok) return

      setBookings(prev => prev.filter(b => b.id !== booking.id))

      if (addBlockedDate) {
        await supabase.from('blocked_dates').insert([{
          vessel_id: vessel.id,
          date_from: booking.date,
          date_to: booking.date,
          bin_type: null,
          type: 'other',
          reason: '出船中止',
        }])
      }
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleCancel = async (booking: Booking) => {
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, status: 'cancelled' }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, status: 'cancelled' } : b
      ))
    }
  }

  const handleEditSave = async () => {
    if (!editingBooking) return
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingBooking.id,
        ...editForm,
      }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b =>
        b.id === editingBooking.id ? { ...b, ...editForm } : b
      ))
      setEditingBooking(null)
    }
  }

  const startEditBooking = (b: Booking) => {
    setEditingBooking(b)
    setEditForm({
      date: b.date,
      bin_type: b.bin_type,
      name: b.name,
      tel: b.tel,
      count: b.count,
      message: b.message || '',
    })
  }

  const getBinLabel = (binType: BinType) =>
    binType === 'day' ? '☀️ 昼便' : binType === 'relay' ? '🌅 昼夜便' : '🌙 夜便'

  const getBinName = (binType: BinType) =>
    binType === 'day' ? '昼便' : binType === 'relay' ? '昼夜便' : '夜便'

  const getBinColor = (binType: BinType) =>
    binType === 'day' ? 'var(--ocean)' : binType === 'relay' ? 'var(--gold)' : 'var(--status-night-fg)'

  const getBinBg = (binType: BinType) =>
    binType === 'day' ? 'var(--status-day-bg)' : binType === 'relay' ? 'var(--status-pending-bg)' : 'var(--status-night-bg)'

  const getBinBorder = (binType: BinType) =>
    binType === 'day' ? 'var(--ocean-light)' : binType === 'relay' ? 'var(--gold)' : 'var(--status-night-fg)'

  const getMaxCap = (binType: BinType) => {
    const bin = binSettings.find(b => b.bin_type === binType)
    return bin?.max_capacity ?? 0
  }

  const getChannelBadge = (channel: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      page: { label: '📱 予約ページ', bg: 'var(--status-day-bg)', color: 'var(--ocean)' },
      line: { label: '💬 LINE', bg: '#E8F8EE', color: '#06C755' },
      line_official: { label: '💬 LINE公式', bg: '#E8F8EE', color: '#06C755' },
      instagram: { label: '📸 Instagram', bg: '#FDE8F4', color: '#C13584' },
      phone: { label: '📞 電話', bg: 'var(--status-closed-bg)', color: 'var(--fg-2)' },
      other: { label: 'その他', bg: 'var(--status-closed-bg)', color: 'var(--fg-2)' },
    }
    const badge = map[channel] || map.other
    return (
      <span style={{ fontSize: '13px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: badge.bg, color: badge.color }}>
        {badge.label}
      </span>
    )
  }

  const switchView = (nextView: 'month' | 'week') => {
    if (nextView === 'week') {
      const baseDate = selectedDate
        ? new Date(selectedDate + 'T00:00:00')
        : new Date()
      setWeekStart(getWeekSunday(baseDate))
    }
    setView(nextView)
  }

  const getBinsForDate = (year: number, month: number, day: number) => {
    const dow = new Date(year, month, day).getDay()
    return binSettings.filter(bin => {
      const isInPeriod = bin.start_month <= bin.end_month
        ? bin.start_month <= month && month <= bin.end_month
        : month >= bin.start_month || month <= bin.end_month
      return isInPeriod && bin.days_of_week.map(Number).includes(dow)
    })
  }

  const renderCell = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = dateStr === toDateStr(new Date())
    const isSelected = selectedDate === dateStr
    const dow = new Date(year, month, day).getDay()
    const holiday = getHolidayInfo(new Date(year, month, day))
    const dateBookings = bookings.filter(b => b.date === dateStr && b.status !== 'rejected')
    const isCharterDate = bookings.some(b => {
      if (!b.is_charter || !b.date_to) return false
      return b.date <= dateStr && dateStr <= b.date_to
    })
    const hasPending = dateBookings.some(b => b.status === 'pending')
    const hasDay = dateBookings.some(b => b.bin_type === 'day')
    const hasNight = dateBookings.some(b => b.bin_type === 'night')
    const hasRelay = dateBookings.some(b => b.bin_type === 'relay')
    const hasSchedule = getBinsForDate(year, month, day).length > 0

    return (
      <div
        key={dateStr}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setSelectedDate(isSelected ? null : dateStr)
          }
        }}
        style={{
          borderRadius: '10px',
          cursor: 'pointer',
          minHeight: '56px',
          border: isSelected ? '3px solid var(--ocean)' : isToday ? '3px solid var(--gold)' : '3px solid transparent',
          padding: '6px 4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          background: hasSchedule ? 'var(--surface)' : 'var(--bg)',
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

        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', minHeight: '7px' }}>
          {hasPending && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-pending-dot)' }} />}
          {hasDay && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--ocean)' }} />}
          {hasNight && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-night-fg)' }} />}
          {hasRelay && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--gold)' }} />}
        </div>
      </div>
    )
  }

  const renderCalendar = () => {
    if (view === 'month') {
      const firstDow = new Date(calYear, calM, 1).getDay()
      const totalDays = new Date(calYear, calM + 1, 0).getDate()
      const cells = []
      for (let i = 0; i < firstDow; i++) {
        cells.push(<div key={`e${i}`} style={{ minHeight: '56px' }} />)
      }
      for (let d = 1; d <= totalDays; d++) {
        cells.push(renderCell(calYear, calM, d))
      }
      return cells
    }

    const cells = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      cells.push(renderCell(d.getFullYear(), d.getMonth(), d.getDate()))
    }
    return cells
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getFullYear()}年${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}〜${weekEnd.getDate()}日`
    : `${MONTH_NAMES[weekStart.getMonth()]}${weekStart.getDate()}日〜${MONTH_NAMES[weekEnd.getMonth()]}${weekEnd.getDate()}日`

  const selectedBookings = selectedDate
    ? bookings
        .filter(b => b.date === selectedDate && b.status !== 'rejected')
        .sort((a, b) => ['day', 'relay', 'night'].indexOf(a.bin_type) - ['day', 'relay', 'night'].indexOf(b.bin_type))
    : []

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const hasWeekBookings = weekDates.some(d =>
    bookings.some(b => b.date === toDateStr(d) && b.status !== 'rejected')
  )

  const renderBookingCard = (b: Booking) => (
    <div key={b.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
          background: b.bin_type === 'day' ? 'var(--status-day-bg)' : b.bin_type === 'relay' ? 'var(--ocean-pale)' : 'var(--status-night-bg)',
          color: b.bin_type === 'day' ? 'var(--ocean)' : b.bin_type === 'relay' ? 'var(--ocean)' : 'var(--status-night-fg)',
        }}>
          {b.bin_type === 'day' ? '☀️ 昼便' : b.bin_type === 'relay' ? '🌅 昼夜便' : '🌙 夜便'}
        </span>
        {getChannelBadge(b.channel)}
        <span style={{
          fontSize: '13px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', marginLeft: 'auto',
          background: b.status === 'confirmed' ? 'var(--status-ok-bg)' : b.status === 'cancelled' ? 'var(--status-closed-bg)' : 'var(--status-pending-bg)',
          color: b.status === 'confirmed' ? 'var(--status-ok-fg)' : b.status === 'cancelled' ? 'var(--fg-3)' : 'var(--status-pending-fg)',
        }}>
          {b.status === 'confirmed' ? '承認済み' : b.status === 'cancelled' ? 'キャンセル' : '承認待ち'}
        </span>
      </div>

      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>
        {b.name}　{b.count}名
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {b.status === 'confirmed' && b.tel && (
            <button onClick={() => handleCall(b)}
              disabled={actionLoading === b.id}
              style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--status-day-bg)', border: '2px solid var(--ocean-light)', color: 'var(--ocean)', fontSize: '16px', cursor: actionLoading === b.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📞
            </button>
          )}
          {b.status === 'confirmed' && (
            <button onClick={() => updateBooking(b.id, { contacted: !b.contacted })}
              disabled={actionLoading === b.id}
              style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', background: b.contacted ? 'var(--status-ok-bg)' : 'var(--surface)', color: b.contacted ? 'var(--status-ok-fg)' : 'var(--fg-3)', border: `2px solid ${b.contacted ? 'var(--status-ok-bd)' : 'var(--border)'}`, borderRadius: '8px', cursor: actionLoading === b.id ? 'wait' : 'pointer' }}>
              {b.contacted ? '✅ 連絡済' : '未連絡'}
            </button>
          )}
          {b.status === 'pending' && (
            <>
              <button onClick={() => updateStatus(b.id, 'confirmed')}
                disabled={actionLoading === b.id}
                style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-ok-bg)', color: 'var(--status-ok-fg)', border: '2px solid var(--status-ok-bd)', borderRadius: '8px', cursor: actionLoading === b.id ? 'wait' : 'pointer' }}>
                承認
              </button>
              <button onClick={() => updateStatus(b.id, 'rejected')}
                disabled={actionLoading === b.id}
                style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: actionLoading === b.id ? 'wait' : 'pointer' }}>
                お断り
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {b.status !== 'cancelled' && (
            <button onClick={() => startEditBooking(b)}
              style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--ocean)', border: '2px solid var(--ocean-light)', borderRadius: '8px', cursor: 'pointer' }}>
              編集
            </button>
          )}
          <button onClick={() => b.status === 'confirmed' ? handleCancel(b) : setDeleteTarget(b)}
            style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: 'pointer' }}>
            {b.status === 'confirmed' ? '取消' : '削除'}
          </button>
          {b.status === 'confirmed' && (
            <button onClick={() => setDeleteTarget(b)}
              style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: 'pointer' }}>
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const WeekBookingRow = ({ b, callBg, callBorder, callColor }: {
    b: Booking
    callBg: string
    callBorder: string
    callColor: string
  }) => renderBookingCard(b)

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '18px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ minHeight: '56px', padding: '0 14px', border: '2px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', color: 'var(--fg-1)', fontSize: '18px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          ← 戻る
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--fg-1)' }}>予約一覧</h1>
          <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vessel?.name}</div>
        </div>
      </div>

      <main style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setShowCandidates(v => !v)}
            style={{ flex: 1, padding: '16px', fontSize: '17px', fontWeight: 700, fontFamily: 'inherit', borderRadius: '12px', cursor: 'pointer', background: showCandidates ? 'var(--ocean)' : 'var(--surface)', color: showCandidates ? '#fff' : 'var(--fg-1)', border: showCandidates ? '2px solid var(--ocean)' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            📥 予約を取り込む
            {candidates.length > 0 && (
              <span style={{ background: 'var(--status-pending-dot)', color: '#fff', fontSize: '13px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>
                {candidates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push('/dashboard/bookings/new')}
            style={{ flex: 1, padding: '16px', fontSize: '17px', fontWeight: 700, fontFamily: 'inherit', borderRadius: '12px', cursor: 'pointer', background: 'var(--surface)', color: 'var(--fg-1)', border: '2px solid var(--border)' }}
          >
            ✏️ メモから予約を入れる
          </button>
        </div>

        {showCandidates && candidates.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>
              取り込み候補　{candidates.length}件
            </div>
            {candidates.map(c => (
              <div key={c.id} style={{ background: 'var(--surface)', border: '2px solid var(--status-pending-dot)', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: 'var(--status-pending-bg)', color: 'var(--status-pending-fg)' }}>
                    {c.channel === 'line' ? '💬 LINE' : c.channel === 'line_official' ? '💬 LINE公式' : c.channel === 'instagram' ? '📸 Instagram' : c.channel === 'phone' ? '📞 電話' : 'その他'}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--fg-3)' }}>
                    {new Date(c.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {c.raw_message && (
                  <div style={{ fontSize: '14px', color: 'var(--fg-3)', background: 'var(--bg)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', lineHeight: 1.6 }}>
                    「{c.raw_message}」
                  </div>
                )}

                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '6px' }}>
                  {c.parsed_date ? `${new Date(c.parsed_date + 'T00:00:00').getMonth()+1}月${new Date(c.parsed_date + 'T00:00:00').getDate()}日` : '日付不明'}
                  　{c.parsed_bin_type === 'day' ? '☀️ 昼便' : c.parsed_bin_type === 'night' ? '🌙 夜便' : c.parsed_bin_type === 'relay' ? '🌅 昼夜便' : '便不明'}
                  　{c.parsed_count || '?'}名
                </div>
                {c.parsed_name && <div style={{ fontSize: '16px', color: 'var(--fg-2)', marginBottom: '4px' }}>{c.parsed_name}</div>}
                {c.parsed_tel && <div style={{ fontSize: '15px', color: 'var(--fg-3)', marginBottom: '10px' }}>{c.parsed_tel}</div>}

                {(!c.parsed_date || !c.parsed_bin_type || !c.parsed_name) && (
                  <div style={{ fontSize: '13px', color: 'var(--status-pending-fg)', background: 'var(--status-pending-bg)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                    ⚠️ {[!c.parsed_date && '日付', !c.parsed_bin_type && '便', !c.parsed_name && '氏名'].filter(Boolean).join('・')}が不明です。登録後に編集してください。
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleApproveCandidate(c)}
                    style={{ flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700, background: 'var(--status-ok-bg)', color: 'var(--status-ok-fg)', border: '2px solid var(--status-ok-bd)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >予約として登録</button>
                  <button
                    onClick={() => handleIgnoreCandidate(c.id)}
                    style={{ flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700, background: 'var(--surface)', color: 'var(--fg-3)', border: '2px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >無視する</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={view === 'month'
                ? () => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }
                : () => setWeekStart(d => { const p = new Date(d); p.setDate(d.getDate() - 7); return p })
              }
              style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '14px', background: 'var(--bg)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '22px', fontWeight: 700, color: 'var(--ocean)' }}
            >◀</button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--fg-1)', lineHeight: 1.2, textAlign: 'center' }}>
                {view === 'month' ? `${calYear}年${MONTH_NAMES[calM]}` : weekLabel}
              </span>
              <div style={{ display: 'flex', background: 'var(--status-closed-bg)', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                {(['month', 'week'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => switchView(v)}
                    style={{
                      padding: '8px 18px', fontSize: '22px', fontWeight: 700, minHeight: '56px',
                      background: view === v ? 'var(--surface)' : 'transparent',
                      color: view === v ? 'var(--ocean)' : 'var(--fg-3)',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: view === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
                    }}
                  >{v === 'month' ? '月' : '週'}</button>
                ))}
              </div>
            </div>

            <button
              onClick={view === 'month'
                ? () => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }
                : () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n })
              }
              style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '14px', background: 'var(--bg)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '22px', fontWeight: 700, color: 'var(--ocean)' }}
            >▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', padding: '8px 0', color: i === 0 ? 'var(--status-full-fg)' : i === 6 ? 'var(--ocean-light)' : 'var(--fg-2)' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { color: 'var(--status-pending-dot)', label: '承認待ち' },
              { color: 'var(--ocean)', label: '昼便' },
              { color: 'var(--status-night-fg)', label: '夜便' },
              { color: 'var(--gold)', label: '昼夜便' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '14px', color: 'var(--fg-2)', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>

          {view === 'week' && (
            <div style={{ marginTop: '16px' }}>
              {weekDates.map(d => {
                const dateStr = toDateStr(d)
                const dayBks = bookings.filter(b => b.date === dateStr && b.bin_type === 'day' && b.status !== 'rejected')
                const nightBks = bookings.filter(b => b.date === dateStr && b.bin_type === 'night' && b.status !== 'rejected')
                const relayBks = bookings.filter(b => b.date === dateStr && b.bin_type === 'relay' && b.status !== 'rejected')
                const pendingBks = bookings.filter(b => b.date === dateStr && b.status === 'pending')

                if (dayBks.length === 0 && nightBks.length === 0 && relayBks.length === 0) return null

                return (
                  <div key={dateStr} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'var(--ocean-pale)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ocean)' }}>
                        {d.getMonth()+1}月{d.getDate()}日（{DAY_NAMES[d.getDay()]}）
                      </span>
                      {pendingBks.length > 0 && (
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-pending-fg)', background: 'var(--status-pending-bg)', padding: '4px 10px', borderRadius: '99px' }}>
                          承認待ち {pendingBks.length}件
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '12px 16px' }}>
                      {dayBks.length > 0 && (
                        <div style={{ marginBottom: nightBks.length > 0 || relayBks.length > 0 ? '12px' : '0' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '8px' }}>
                            ☀️ 昼便　{dayBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('day')}名
                          </div>
                          {dayBks.map(b => (
                            <WeekBookingRow
                              key={b.id}
                              b={b}
                              callBg="var(--status-day-bg)"
                              callBorder="var(--ocean-light)"
                              callColor="var(--ocean)"
                            />
                          ))}
                        </div>
                      )}

                      {relayBks.length > 0 && (
                        <div style={{ marginBottom: nightBks.length > 0 ? '12px' : '0' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gold)', marginBottom: '8px' }}>
                            🌅 昼夜便　{relayBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('relay')}名
                          </div>
                          {relayBks.map(b => (
                            <WeekBookingRow
                              key={b.id}
                              b={b}
                              callBg="var(--status-pending-bg)"
                              callBorder="var(--gold)"
                              callColor="var(--gold)"
                            />
                          ))}
                        </div>
                      )}

                      {nightBks.length > 0 && (
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-night-fg)', marginBottom: '8px' }}>
                            🌙 夜便　{nightBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('night')}名
                          </div>
                          {nightBks.map(b => (
                            <WeekBookingRow
                              key={b.id}
                              b={b}
                              callBg="var(--status-night-bg)"
                              callBorder="var(--status-night-fg)"
                              callColor="var(--status-night-fg)"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {!hasWeekBookings && (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--fg-3)', fontSize: '18px', fontWeight: 600 }}>
                  この週の予約はありません
                </div>
              )}
            </div>
          )}
        </section>

        {selectedDate && (
          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '16px', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(180deg,var(--ocean) 0%,#0F4570 100%)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--surface)' }}>
                {(() => {
                  const d = new Date(selectedDate + 'T00:00:00')
                  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
                })()}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                aria-label="閉じる"
                style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: '12px', color: 'var(--surface)', fontSize: '22px', cursor: 'pointer', padding: '4px', lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>

            {selectedBookings.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: 'var(--fg-2)', fontSize: '18px', fontWeight: 600 }}>
                予約はありません
              </div>
            ) : (
              selectedBookings.map(b => renderBookingCard(b))
            )}
          </section>
        )}

        {editingBooking && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '16px' }}>予約を編集する</div>

              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>日付</label>
              <input type="date" value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' as const, color: 'var(--fg-1)', background: 'var(--surface)' }} />

              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>便</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {([
                  { key: 'day', label: '☀️ 昼便' },
                  { key: 'night', label: '🌙 夜便' },
                  { key: 'relay', label: '🌅 昼夜便' },
                ] as const).map(({ key, label }) => (
                  <button key={key}
                    onClick={() => setEditForm(f => ({ ...f, bin_type: key }))}
                    style={{ flex: 1, padding: '10px 4px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                      background: editForm.bin_type === key ? 'var(--ocean-pale)' : 'var(--surface)',
                      color: editForm.bin_type === key ? 'var(--ocean)' : 'var(--fg-3)',
                      border: editForm.bin_type === key ? '2px solid var(--ocean)' : '2px solid var(--border)',
                      borderRadius: '10px', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>

              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>氏名</label>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' as const, color: 'var(--fg-1)', background: 'var(--surface)' }} />

              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>電話番号</label>
              <input value={editForm.tel} onChange={e => setEditForm(f => ({ ...f, tel: e.target.value }))}
                type="tel" style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' as const, color: 'var(--fg-1)', background: 'var(--surface)' }} />

              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>人数</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <button onClick={() => setEditForm(f => ({ ...f, count: Math.max(1, f.count - 1) }))}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>－</button>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ocean)', minWidth: '40px', textAlign: 'center' }}>{editForm.count}</span>
                <button onClick={() => setEditForm(f => ({ ...f, count: f.count + 1 }))}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', cursor: 'pointer', fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>＋</button>
              </div>

              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>メモ</label>
              <input value={editForm.message} onChange={e => setEditForm(f => ({ ...f, message: e.target.value }))}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', marginBottom: '16px', boxSizing: 'border-box' as const, color: 'var(--fg-1)', background: 'var(--surface)' }} />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditingBooking(null)}
                  style={{ flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700, background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--fg-1)' }}>
                  キャンセル
                </button>
                <button onClick={handleEditSave}
                  style={{ flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700, background: 'var(--ocean)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '8px' }}>
                予約を削除しますか？
              </div>
              <div style={{ fontSize: '15px', color: 'var(--fg-2)', marginBottom: '20px', lineHeight: 1.7 }}>
                {deleteTarget.name}さん　{new Date(deleteTarget.date + 'T00:00:00').getMonth()+1}月{new Date(deleteTarget.date + 'T00:00:00').getDate()}日　{deleteTarget.bin_type === 'day' ? '昼便' : deleteTarget.bin_type === 'night' ? '夜便' : '昼夜便'}
              </div>

              <div style={{ background: 'var(--status-pending-bg)', border: '2px solid var(--status-pending-dot)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '14px', color: 'var(--status-pending-fg)', lineHeight: 1.7 }}>
                ⚠️ この日の出船を中止する場合は、新たな予約が入らないよう休船日に設定することをお勧めします。
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleDelete(deleteTarget, true)}
                  disabled={deleting}
                  style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700, background: 'var(--status-full-fg)', color: '#fff', border: 'none', borderRadius: '12px', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  削除する＋この日を休船日に設定する
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget, false)}
                  disabled={deleting}
                  style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700, background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '12px', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  削除のみ
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700, background: 'transparent', color: 'var(--fg-2)', border: '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
