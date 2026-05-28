'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CaptainButton, CaptainCard } from '@/components/captain-ui'
import { PageShell, LoadingScreen, StatusPill, binLabel, formatDate, toDateStr } from './_components/CaptainShell'
import styles from './DashboardPage.module.css'

type Vessel = { id: string; name: string; auto_confirm?: boolean; setup_completed?: boolean }
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

      const { data: v } = await supabase.from('vessels').select('id, name, auto_confirm, setup_completed').eq('user_id', session.user.id).single()
      if (!v) { router.push('/register'); return }

      if (!String(v.name || '').trim()) {
        router.push('/dashboard/setup')
        return
      }

      const { count: binCount } = await supabase
        .from('bin_settings')
        .select('id', { count: 'exact', head: true })
        .eq('vessel_id', v.id)

      if ((binCount || 0) === 0) {
        router.push('/dashboard/setup?step=2')
        return
      }

      if (!v.setup_completed) {
        router.push('/dashboard/setup')
        return
      }

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
  const binBadgeClass = (binType: string) => {
    if (binType === 'night') return `${styles.binBadge} ${styles.nightBadge}`
    if (binType === 'relay') return `${styles.binBadge} ${styles.relayBadge}`
    return `${styles.binBadge} ${styles.dayBadge}`
  }

  const PassengerCard = ({ booking }: { booking: Booking }) => (
    <CaptainCard className={styles.passengerCard}>
      <div className={styles.passengerSummary}>
        <span className={styles.passengerName}>{booking.name} 様</span>
        <span className={styles.subText}>{booking.count}名</span>
        <span className={binBadgeClass(booking.bin_type)}>{binLabel(booking.bin_type)}</span>
      </div>
      <div className={styles.row}>
        {booking.contacted ? <StatusPill tone="green">連絡済み</StatusPill> : <StatusPill tone="amber">未連絡</StatusPill>}
        {(booking.call_attempts || 0) > 0 && <StatusPill tone="red">留守 {booking.call_attempts}回</StatusPill>}
        {!booking.contacted && booking.tel && <CaptainButton className={styles.callButton} onClick={() => beginCall(booking)}>今すぐ電話</CaptainButton>}
      </div>
    </CaptainCard>
  )

  return (
    <PageShell title={vessel?.name || 'ダッシュボード'} menu>
      {notice && <CaptainCard className={styles.notice}>{notice}</CaptainCard>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>対応待ち</h2>
        {contacts.map(contact => (
          <CaptainCard className={styles.contactCard} key={contact.id}>
            <div className={styles.contactLabel}>貸切問い合わせ</div>
            <div className={styles.contactTitle}>{contact.name || '名前未登録'} 様 {contact.preferred_date ? formatDate(contact.preferred_date) : ''}</div>
            <p className={styles.contactMessage}>{contact.message}</p>
            <CaptainButton onClick={() => router.push('/dashboard/contact')} variant="secondary">詳細を見る</CaptainButton>
          </CaptainCard>
        ))}
        {actionable.map(booking => (
          <CaptainCard key={booking.id}>
            <div className={styles.wrapRow}>
              {booking.needs_call && <StatusPill tone="amber">要電話連絡</StatusPill>}
              {booking.status === 'pending' && <StatusPill tone="amber">承認待ち</StatusPill>}
              {booking.is_charter && <StatusPill tone="amber">貸切</StatusPill>}
            </div>
            <div className={styles.actionMeta}>{booking.name} 様 {formatDate(booking.date)} {binLabel(booking.bin_type)} {booking.count}名</div>
            {(booking.call_attempts || 0) > 0 && <p className={styles.callAttempts}>留守 {booking.call_attempts}回</p>}
            <div className={`${styles.wrapRow} ${styles.topGap}`}>
              {booking.tel && <CaptainButton onClick={() => beginCall(booking)}>今すぐ電話</CaptainButton>}
              {booking.status === 'pending' && <CaptainButton onClick={() => updateBooking(booking, { status: 'confirmed' })} variant="secondary">承認する</CaptainButton>}
            </div>
          </CaptainCard>
        ))}
        {contacts.length === 0 && actionable.length === 0 && <CaptainCard>今すぐ対応が必要な予約はありません。</CaptainCard>}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>今日の出船</h2>
          {todaysBookings.length > 0 && <CaptainButton onClick={() => setCancelOpen(true)} variant="danger">本日の出船を中止</CaptainButton>}
        </div>
        {todaysBookings.length > 0 ? todaysBookings.map(b => <PassengerCard key={b.id} booking={b} />) : <CaptainCard>本日出船なし</CaptainCard>}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>明日の出船</h2>
        {tomorrowBookings.length > 0 ? tomorrowBookings.map(b => <PassengerCard key={b.id} booking={b} />) : <CaptainCard>明日出船なし</CaptainCard>}
      </section>

      {todaysBookings.length === 0 && tomorrowBookings.length === 0 && nextBooking && (
        <section>
          <h2 className={styles.sectionTitle}>直近の出船</h2>
        <CaptainCard>{formatDate(nextBooking.date)} の予約があります。<CaptainButton className={styles.nextBookingButton} onClick={() => router.push('/dashboard/bookings')} variant="secondary">予約一覧を見る</CaptainButton></CaptainCard>
      </section>
      )}

      {callTarget && (
        <div className={styles.modalOverlay}>
          <CaptainCard className={styles.modalCard}>
            <h3 className={styles.modalTitle}>{callTarget.name}様への連絡はとれましたか？</h3>
            <div className={styles.twoColumnActions}>
              <CaptainButton onClick={markConnected}>つながった</CaptainButton>
              <CaptainButton onClick={markNoAnswer} variant="secondary">留守だった</CaptainButton>
            </div>
          </CaptainCard>
        </div>
      )}

      {cancelOpen && (
        <div className={styles.modalOverlay}>
          <CaptainCard className={styles.modalCard}>
            <h3 className={styles.modalTitle}>本日の出船を中止しますか？</h3>
            <p className={styles.modalDescription}>承認済みの乗船客をキャンセルし、休船日に登録します。</p>
            <div className={styles.stackActions}>
              <CaptainButton disabled={saving} onClick={cancelToday} variant="danger">{saving ? '処理中...' : '中止する'}</CaptainButton>
              <CaptainButton onClick={() => setCancelOpen(false)} variant="secondary">キャンセル</CaptainButton>
            </div>
          </CaptainCard>
        </div>
      )}
    </PageShell>
  )
}
