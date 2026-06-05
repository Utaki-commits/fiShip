'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getHolidayInfo } from '@/lib/holidays'
import CaptainHeader from '@/components/CaptainHeader'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, StatusPill, binBadgeStyle, binLabel, formatDate, toDateStr } from '../_components/CaptainShell'

type Booking = {
  id: string
  vessel_id: string
  date: string
  bin_type: 'day' | 'night' | 'relay'
  name: string
  tel: string
  count: number
  fishing_style: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  channel: string
  contacted: boolean
  needs_call: boolean
  call_attempts: number | null
}
type BinSetting = { bin_type: 'day' | 'night' | 'relay'; max_capacity: number; start_month: number; end_month: number; days_of_week: number[] }
type BlockedDate = { date_from: string; date_to: string; bin_type: string | null; type: string; reason: string | null }

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const dayNames = ['日','月','火','水','木','金','土']
const actionButtonStyle = { width: '96px', whiteSpace: 'nowrap' as const }
const calendarBadgeStyle = { color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '4px', lineHeight: 1.2, whiteSpace: 'nowrap' as const }

export default function BookingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bins, setBins] = useState<BinSetting[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [currentMonth, setCurrentMonth] = useState(monthStart(new Date()))
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [callTarget, setCallTarget] = useState<Booking | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase.from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      const [{ data: bk }, { data: bs }, { data: bd }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', vessel.id).neq('status', 'rejected').order('date', { ascending: true }),
        supabase.from('bin_settings').select('bin_type, max_capacity, start_month, end_month, days_of_week').eq('vessel_id', vessel.id),
        supabase.from('blocked_dates').select('*').eq('vessel_id', vessel.id),
      ])
      setBookings((bk || []) as Booking[])
      setBins((bs || []) as BinSetting[])
      setBlockedDates((bd || []) as BlockedDate[])
      setLoading(false)
    }
    init()
  }, [router])

  const days = useMemo(() => {
    const first = monthStart(currentMonth)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [currentMonth])

  const bookingStatsByDate = useMemo(() => {
    const stats: Record<string, { day: number; night: number; total: number }> = {}
    bookings.forEach(booking => {
      if (booking.status === 'cancelled') return
      const bookingDate = new Date(`${booking.date}T00:00:00`)
      if (bookingDate.getFullYear() !== currentMonth.getFullYear() || bookingDate.getMonth() !== currentMonth.getMonth()) return
      stats[booking.date] = stats[booking.date] || { day: 0, night: 0, total: 0 }
      stats[booking.date].total += 1
      if (booking.bin_type === 'day' || booking.bin_type === 'relay') stats[booking.date].day += 1
      if (booking.bin_type === 'night' || booking.bin_type === 'relay') stats[booking.date].night += 1
    })
    return stats
  }, [bookings, currentMonth])

  const updateBooking = async (booking: Booking, payload: Record<string, unknown>) => {
    const res = await fetch('/api/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: booking.id, ...payload }) })
    if (!res.ok) return
    const data = await res.json()
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...data.booking } : b))
  }

  const callBooking = (booking: Booking) => {
    window.location.href = `tel:${booking.tel}`
    setCallTarget(booking)
  }

  const isBlocked = (dateStr: string) => blockedDates.some(b => b.date_from <= dateStr && dateStr <= b.date_to)
  const dailyBookings = (dateStr: string) => bookings.filter(b => b.date === dateStr && b.status !== 'cancelled')
  const getDateTextColor = (date: Date) => {
    if (getHolidayInfo(date) || date.getDay() === 0) return '#B91C1C'
    if (date.getDay() === 6) return '#2563EB'
    return '#1A2420'
  }
  const dayCapacity = (date: Date) => {
    const month = date.getMonth()
    const dow = date.getDay()
    return bins.filter(bin => {
      const inPeriod = bin.start_month <= bin.end_month ? bin.start_month <= month && month <= bin.end_month : month >= bin.start_month || month <= bin.end_month
      return inPeriod && bin.days_of_week.includes(dow)
    }).reduce((sum, bin) => sum + bin.max_capacity, 0)
  }

  if (loading) return <LoadingScreen />

  const selectedBookings = dailyBookings(selectedDate)
  const selectedBookingCount = selectedBookings.length

  return (
    <PageShell title="予約一覧" menu hero={<CaptainHeader vesselId={vesselId} />}>
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={{ ...secondaryButtonStyle, minWidth: '72px', minHeight: '44px' }}>前月</button>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</div>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={{ ...secondaryButtonStyle, minWidth: '72px', minHeight: '44px' }}>翌月</button>
      </div>

      <div style={{ ...cardStyle, padding: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
          {dayNames.map((d, i) => <div key={d} style={{ textAlign: 'center', color: i === 0 ? '#B91C1C' : i === 6 ? '#2563EB' : '#1A2420', fontSize: '13px' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days.map((day, index) => {
            const dateStr = toDateStr(day)
            if (day.getMonth() !== currentMonth.getMonth()) {
              const weekStart = Math.floor(index / 7) * 7
              const weekDays = days.slice(weekStart, weekStart + 7)
              const isTrailingNextMonth = day > currentMonth && weekDays.some(weekDay => weekDay.getMonth() === currentMonth.getMonth())
              if (isTrailingNextMonth) {
                return (
                  <div key={dateStr} style={{ height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D5DB', fontSize: '20px', lineHeight: 1.2, fontWeight: 500 }}>
                    {day.getDate()}
                  </div>
                )
              }
              return <div key={dateStr} style={{ minHeight: 0 }} />
            }
            const dayBookings = dailyBookings(dateStr)
            const blocked = isBlocked(dateStr)
            const selected = dateStr === selectedDate
            const bookingStats = bookingStatsByDate[dateStr] || { day: 0, night: 0, total: 0 }
            const hasBookings = bookingStats.total > 0
            const hasDay = bookingStats.day > 0
            const hasNight = bookingStats.night > 0
            const today = toDateStr(new Date()) === dateStr
            const cellBackground = blocked ? '#D1D5DB' : colors.card
            const cellTextColor = blocked ? '#1A2420' : getDateTextColor(day)
            const cellBorder = today
              ? '2px solid #B91C1C'
              : `0.5px solid ${selected ? colors.action : colors.border}`
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)} style={{ height: '56px', boxSizing: 'border-box', borderRadius: '10px', border: cellBorder, background: cellBackground, color: cellTextColor, fontFamily: 'inherit', padding: '4px 2px', fontWeight: 500, display: 'flex', flexDirection: 'column', justifyContent: blocked ? 'center' : 'space-between', alignItems: 'center', overflow: 'hidden' }}>
                <div style={{ fontSize: '20px', lineHeight: 1.2 }}>{day.getDate()}</div>
                {blocked && <div style={{ fontSize: '13px' }}>休</div>}
                {!blocked && hasBookings && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', minHeight: '14px', maxWidth: '100%' }}>
                    {hasDay && <span style={{ ...calendarBadgeStyle, background: '#F59E0B' }}>昼{bookingStats.day}</span>}
                    {hasNight && <span style={{ ...calendarBadgeStyle, background: '#1A3A5C' }}>夜{bookingStats.night}</span>}
                  </div>
                )}
                {!blocked && !hasBookings && <div style={{ minHeight: '14px' }} />}
              </button>
            )
          })}
        </div>
      </div>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', margin: '18px 0 10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>{formatDate(selectedDate)}の予約</h2>
          <StatusPill tone="green">{selectedBookingCount}件</StatusPill>
        </div>
        {selectedBookings.length === 0 && <div style={cardStyle}>この日の予約はありません。</div>}
        {selectedBookings.map(b => (
          <div key={b.id} style={cardStyle}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={binBadgeStyle(b.bin_type)}>{binLabel(b.bin_type)}</span>
              <StatusPill tone={b.status === 'confirmed' ? 'green' : 'amber'}>{b.status === 'confirmed' ? '承認済み' : '承認待ち'}</StatusPill>
              {b.needs_call && <StatusPill tone="amber">要電話</StatusPill>}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>{b.name} 様 {b.count}名</div>
            <div style={{ color: colors.sub, lineHeight: 1.7 }}>
              電話: {b.tel || '未入力'}<br />釣り方: {b.fishing_style || '未入力'}<br />メッセージ: {b.message || 'なし'}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {b.tel && <button onClick={() => callBooking(b)} style={{ ...primaryButtonStyle, ...actionButtonStyle }}>電話する</button>}
              {b.status === 'pending' && <button onClick={() => updateBooking(b, { status: 'confirmed' })} style={{ ...secondaryButtonStyle, ...actionButtonStyle }}>承認</button>}
              {b.status === 'pending' && <button onClick={() => updateBooking(b, { status: 'rejected' })} style={{ ...dangerButtonStyle, ...actionButtonStyle }}>お断り</button>}
              {b.status === 'confirmed' && <button onClick={() => updateBooking(b, { status: 'cancelled' })} style={{ ...dangerButtonStyle, ...actionButtonStyle }}>キャンセル</button>}
            </div>
          </div>
        ))}
      </section>

      {callTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ ...cardStyle, maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 12px' }}>{callTarget.name}様への連絡はとれましたか？</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => { updateBooking(callTarget, { contacted: true, needs_call: false }); setCallTarget(null) }} style={{ ...primaryButtonStyle, ...actionButtonStyle }}>つながった</button>
              <button onClick={() => { updateBooking(callTarget, { needs_call: true, call_attempts: (callTarget.call_attempts || 0) + 1 }); setCallTarget(null) }} style={{ ...secondaryButtonStyle, ...actionButtonStyle }}>留守だった</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
