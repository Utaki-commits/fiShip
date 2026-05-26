'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, StatusPill, binBadgeStyle, binLabel, formatDate, toDateStr } from './_components/CaptainShell'

type Vessel = { id: string; name: string; auto_confirm?: boolean }
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
  is_charter: boolean
  needs_call: boolean
  needs_call_reason: string | null
  call_attempts: number | null
}
type Contact = { id: string; name: string; message: string; preferred_date: string | null; is_charter: boolean; is_negotiating: boolean }

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [callTarget, setCallTarget] = useState<Booking | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const today = useMemo(() => toDateStr(new Date()), [])
  const tomorrow = useMemo(() => toDateStr(new Date(Date.now() + 86400000)), [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: v } = await supabase.from('vessels').select('id, name, auto_confirm').eq('user_id', session.user.id).single()
      if (!v) { router.push('/register'); return }
      setVessel(v as Vessel)

      const [{ data: bk }, { data: ct }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', v.id).gte('date', today).neq('status', 'rejected').order('date', { ascending: true }),
        supabase.from('contacts').select('*').eq('vessel_id', v.id).eq('is_charter', true).eq('is_negotiating', true).order('created_at', { ascending: false }),
      ])
      setBookings((bk || []) as Booking[])
      setContacts((ct || []) as Contact[])
      setLoading(false)
    }
    init()
  }, [router, today])

  const updateBooking = async (booking: Booking, payload: Record<string, unknown>) => {
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, ...payload }),
    })
    if (!res.ok) return
    const data = await res.json()
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...data.booking } : b))
  }

  const beginCall = (booking: Booking) => {
    window.location.href = `tel:${booking.tel}`
    setCallTarget(booking)
  }

  const markConnected = async () => {
    if (!callTarget) return
    await updateBooking(callTarget, { contacted: true, needs_call: false })
    setCallTarget(null)
    setNotice('連絡済みにしました')
    setTimeout(() => setNotice(''), 2000)
  }

  const markNoAnswer = async () => {
    if (!callTarget) return
    const next = (callTarget.call_attempts || 0) + 1
    await updateBooking(callTarget, { call_attempts: next, needs_call: true })
    setCallTarget(null)
    setNotice(`留守 ${next}回として記録しました`)
    setTimeout(() => setNotice(''), 2000)
  }

  const cancelToday = async () => {
    if (!vessel) return
    setSaving(true)
    try {
      const todays = bookings.filter(b => b.date === today && b.status === 'confirmed')
      await Promise.all(todays.map(b => updateBooking(b, { status: 'cancelled' })))
      await supabase.from('blocked_dates').insert([{ vessel_id: vessel.id, date_from: today, date_to: today, bin_type: null, type: 'trouble', reason: '出船中止' }])
      setBookings(prev => prev.map(b => b.date === today ? { ...b, status: 'cancelled' } : b))
      setCancelOpen(false)
      setNotice('本日の出船を中止しました')
      setTimeout(() => setNotice(''), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  const actionable = bookings.filter(b => b.status !== 'cancelled' && (b.needs_call || b.status === 'pending' || b.is_charter))
  const todaysBookings = bookings.filter(b => b.date === today && b.status === 'confirmed')
  const tomorrowBookings = bookings.filter(b => b.date === tomorrow && b.status === 'confirmed')
  const nextBooking = bookings.find(b => b.date > tomorrow && b.status === 'confirmed')

  const PassengerCard = ({ booking }: { booking: Booking }) => (
    <div style={{ ...cardStyle, marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '20px', fontWeight: 500, color: colors.text }}>{booking.name} 様</span>
        <span style={{ color: colors.sub }}>{booking.count}名</span>
        <span style={binBadgeStyle(booking.bin_type)}>{binLabel(booking.bin_type)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {booking.contacted ? <StatusPill tone="green">連絡済み</StatusPill> : <StatusPill tone="amber">未連絡</StatusPill>}
        {(booking.call_attempts || 0) > 0 && <StatusPill tone="red">留守 {booking.call_attempts}回</StatusPill>}
        {!booking.contacted && booking.tel && <button onClick={() => beginCall(booking)} style={{ ...primaryButtonStyle, marginLeft: 'auto' }}>今すぐ電話</button>}
      </div>
    </div>
  )

  return (
    <PageShell title={vessel?.name || 'ダッシュボード'} menu>
      {notice && <div style={{ ...cardStyle, background: colors.greenBg, color: colors.green }}>{notice}</div>}

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>対応待ち</h2>
        {contacts.map(contact => (
          <div key={contact.id} style={{ ...cardStyle, background: colors.amberBg, border: `0.5px solid ${colors.amberBorder}` }}>
            <div style={{ color: colors.amber, fontWeight: 500, marginBottom: '8px' }}>貸切問い合わせ</div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>{contact.name || '名前未登録'} 様 {contact.preferred_date ? formatDate(contact.preferred_date) : ''}</div>
            <p style={{ color: colors.sub, lineHeight: 1.6 }}>{contact.message}</p>
            <button onClick={() => router.push('/dashboard/contact')} style={secondaryButtonStyle}>詳細を見る</button>
          </div>
        ))}
        {actionable.map(booking => (
          <div key={booking.id} style={cardStyle}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {booking.needs_call && <StatusPill tone="amber">要電話連絡</StatusPill>}
              {booking.status === 'pending' && <StatusPill tone="amber">承認待ち</StatusPill>}
              {booking.is_charter && <StatusPill tone="amber">貸切</StatusPill>}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>{booking.name} 様 {formatDate(booking.date)} {binLabel(booking.bin_type)} {booking.count}名</div>
            {(booking.call_attempts || 0) > 0 && <p style={{ color: colors.action, margin: '8px 0 0' }}>留守 {booking.call_attempts}回</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {booking.tel && <button onClick={() => beginCall(booking)} style={primaryButtonStyle}>今すぐ電話</button>}
              {booking.status === 'pending' && <button onClick={() => updateBooking(booking, { status: 'confirmed' })} style={secondaryButtonStyle}>承認する</button>}
            </div>
          </div>
        ))}
        {contacts.length === 0 && actionable.length === 0 && <div style={cardStyle}>今すぐ対応が必要な予約はありません。</div>}
      </section>

      <section style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: 0 }}>今日の出船</h2>
          {todaysBookings.length > 0 && <button onClick={() => setCancelOpen(true)} style={dangerButtonStyle}>本日の出船を中止</button>}
        </div>
        {todaysBookings.length > 0 ? todaysBookings.map(b => <PassengerCard key={b.id} booking={b} />) : <div style={cardStyle}>本日出船なし</div>}
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>明日の出船</h2>
        {tomorrowBookings.length > 0 ? tomorrowBookings.map(b => <PassengerCard key={b.id} booking={b} />) : <div style={cardStyle}>明日出船なし</div>}
      </section>

      {todaysBookings.length === 0 && tomorrowBookings.length === 0 && nextBooking && (
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>直近の出船</h2>
        <div style={cardStyle}>{formatDate(nextBooking.date)} の予約があります。<button onClick={() => router.push('/dashboard/bookings')} style={{ ...secondaryButtonStyle, marginTop: '12px', width: '100%' }}>予約一覧を見る</button></div>
      </section>
      )}

      {callTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ ...cardStyle, maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 12px' }}>{callTarget.name}様への連絡はとれましたか？</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={markConnected} style={primaryButtonStyle}>つながった</button>
              <button onClick={markNoAnswer} style={secondaryButtonStyle}>留守だった</button>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ ...cardStyle, maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 12px' }}>本日の出船を中止しますか？</h3>
            <p style={{ color: colors.sub, lineHeight: 1.7 }}>承認済みの乗船客をキャンセルし、休船日に登録します。</p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button disabled={saving} onClick={cancelToday} style={dangerButtonStyle}>{saving ? '処理中...' : '中止する'}</button>
              <button onClick={() => setCancelOpen(false)} style={secondaryButtonStyle}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
