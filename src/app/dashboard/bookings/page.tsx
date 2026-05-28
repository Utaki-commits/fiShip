'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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

  return (
    <PageShell title="予約一覧">
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} style={secondaryButtonStyle}>前月</button>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</div>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} style={secondaryButtonStyle}>翌月</button>
      </div>

      <div style={{ ...cardStyle, padding: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
          {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ textAlign: 'center', color: colors.sub, fontSize: '13px' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days.map(day => {
            const dateStr = toDateStr(day)
            if (day.getMonth() !== currentMonth.getMonth()) {
              return <div key={dateStr} style={{ minHeight: '62px' }} />
            }
            const dayBookings = dailyBookings(dateStr)
            const pending = dayBookings.some(b => b.status === 'pending')
            const needsCall = dayBookings.some(b => b.needs_call)
            const blocked = isBlocked(dateStr)
            const selected = dateStr === selectedDate
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)} style={{ minHeight: '62px', borderRadius: '10px', border: `0.5px solid ${selected ? colors.action : colors.border}`, background: blocked ? '#F3F4F6' : colors.card, color: colors.text, fontFamily: 'inherit', padding: '6px', fontWeight: 500 }}>
                <div>{day.getDate()}</div>
                {!blocked && dayBookings.length > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', height: '22px', borderRadius: '11px', background: colors.action, color: '#fff', fontSize: '12px', marginTop: '4px' }}>
                    {dayBookings.length}
                  </div>
                )}
                <div style={{ fontSize: '12px', minHeight: '16px' }}>{pending ? '⚠️' : ''}{needsCall ? '📞' : ''}</div>
              </button>
            )
          })}
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '18px 0 10px' }}>{formatDate(selectedDate)}の予約</h2>
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
              {b.tel && <button onClick={() => callBooking(b)} style={primaryButtonStyle}>電話する</button>}
              {b.status === 'pending' && <button onClick={() => updateBooking(b, { status: 'confirmed' })} style={secondaryButtonStyle}>承認</button>}
              {b.status === 'pending' && <button onClick={() => updateBooking(b, { status: 'rejected' })} style={dangerButtonStyle}>お断り</button>}
              {b.status === 'confirmed' && <button onClick={() => updateBooking(b, { status: 'cancelled' })} style={dangerButtonStyle}>キャンセル</button>}
            </div>
          </div>
        ))}
      </section>

      {callTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ ...cardStyle, maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 12px' }}>{callTarget.name}様への連絡はとれましたか？</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => { updateBooking(callTarget, { contacted: true, needs_call: false }); setCallTarget(null) }} style={primaryButtonStyle}>つながった</button>
              <button onClick={() => { updateBooking(callTarget, { needs_call: true, call_attempts: (callTarget.call_attempts || 0) + 1 }); setCallTarget(null) }} style={secondaryButtonStyle}>留守だった</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
