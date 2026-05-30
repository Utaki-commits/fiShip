'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CaptainButton, CaptainCard } from '@/components/captain-ui'
import { DAY_NAMES, PageShell, LoadingScreen, StatusPill, binLabel, formatDate, toDateStr } from './_components/CaptainShell'
import styles from './DashboardPage.module.css'

type Vessel = { id: string; name: string; captain_name?: string | null; banner_url?: string | null; auto_confirm?: boolean; setup_completed?: boolean; date_format?: 'western' | 'japanese' | null }
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
type CancelTarget = { date: string; bin_type: 'day' | 'night' | 'relay'; bin_name: string }

const toJapaneseYear = (date: Date) => {
  const year = date.getFullYear()
  if (year >= 2019) return `令和${year - 2018}年`
  if (year >= 1989) return `平成${year - 1988}年`
  return `${year}年`
}

const formatHeroDate = (date: Date, format?: 'western' | 'japanese' | null) => {
  const prefix = format === 'japanese' ? toJapaneseYear(date) : `${date.getFullYear()}年`
  return `${prefix}${date.getMonth() + 1}月${date.getDate()}日（${DAY_NAMES[date.getDay()]}）`
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [snsCounts, setSnsCounts] = useState({ line: 0, instagram: 0 })
  const [callTarget, setCallTarget] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const todayDate = useMemo(() => new Date(), [])

  const today = useMemo(() => toDateStr(new Date()), [])
  const tomorrow = useMemo(() => toDateStr(new Date(Date.now() + 86400000)), [])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: v } = await supabase.from('vessels').select('id, name, captain_name, banner_url, auto_confirm, setup_completed, date_format').eq('user_id', session.user.id).single()
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

      const [{ data: bk }, { data: ct }, { count: lineCount }, { count: instagramCount }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', v.id).gte('date', today).neq('status', 'rejected').order('date', { ascending: true }),
        supabase.from('contacts').select('*').eq('vessel_id', v.id).eq('is_charter', true).eq('is_negotiating', true).order('created_at', { ascending: false }),
        supabase.from('sns_messages').select('id', { count: 'exact', head: true }).eq('vessel_id', v.id).eq('channel', 'line').eq('status', 'unprocessed'),
        supabase.from('sns_messages').select('id', { count: 'exact', head: true }).eq('vessel_id', v.id).eq('channel', 'instagram').eq('status', 'unprocessed'),
      ])
      setBookings((bk || []) as Booking[])
      setContacts((ct || []) as Contact[])
      setSnsCounts({ line: lineCount || 0, instagram: instagramCount || 0 })
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

  const cancelSailing = async () => {
    if (!vessel || !cancelTarget) return
    setSaving(true)
    try {
      const res = await fetch('/api/cancel-all-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vessel_id: vessel.id, date: cancelTarget.date, bin_type: cancelTarget.bin_type }),
      })
      if (!res.ok) throw new Error('cancel failed')
      setBookings(prev => prev.map(b => b.date === cancelTarget.date && b.bin_type === cancelTarget.bin_type ? { ...b, status: 'cancelled' } : b))
      setCancelTarget(null)
      setNotice(`${formatDate(cancelTarget.date)} ${cancelTarget.bin_name}の出船を中止しました`)
      setTimeout(() => setNotice(''), 2500)
    } catch {
      setNotice('出船中止を保存できませんでした')
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
  const waitingCount = contacts.length + actionable.length + snsCounts.line + snsCounts.instagram
  const binBadgeClass = (binType: string) => {
    if (binType === 'night') return `${styles.binBadge} ${styles.nightBadge}`
    if (binType === 'relay') return `${styles.binBadge} ${styles.relayBadge}`
    return `${styles.binBadge} ${styles.dayBadge}`
  }

  const DashboardHero = () => (
    <div className={styles.hero}>
      {vessel?.banner_url && <img className={styles.heroImage} src={vessel.banner_url} alt={`${vessel.name} バナー`} />}
      <div className={styles.heroOverlay}>
        <div>
          <div className={styles.heroTitle}>{vessel?.name || 'ダッシュボード'}</div>
          <div className={styles.heroSub}>船長 {vessel?.captain_name || '未設定'}</div>
        </div>
        <div className={styles.heroDate}>{formatHeroDate(todayDate, vessel?.date_format)}</div>
      </div>
    </div>
  )

  const PassengerCard = ({ booking }: { booking: Booking }) => (
    <div className={styles.passengerCard}>
      <div className={styles.passengerSummary}>
        <span className={styles.passengerName}>{booking.name} 様</span>
        <span className={styles.subText}>{booking.count}名</span>
        <span className={binBadgeClass(booking.bin_type)}>{binLabel(booking.bin_type)}</span>
      </div>
      <div className={styles.row}>
        {booking.contacted ? <StatusPill tone="green">連絡済み</StatusPill> : <StatusPill tone="amber">未連絡</StatusPill>}
        {(booking.call_attempts || 0) > 0 && <StatusPill tone="red">留守 {booking.call_attempts}回</StatusPill>}
        {!booking.contacted && booking.tel && <CaptainButton className={styles.callButton} onClick={() => beginCall(booking)}>今すぐ電話する</CaptainButton>}
      </div>
    </div>
  )

  const SailingSection = ({ date, bookingsForDate }: { date: string; bookingsForDate: Booking[] }) => {
    const grouped = bookingsForDate.reduce<Record<string, Booking[]>>((acc, booking) => {
      acc[booking.bin_type] = [...(acc[booking.bin_type] || []), booking]
      return acc
    }, {})
    const groups = (Object.entries(grouped) as Array<['day' | 'night' | 'relay', Booking[]]>)

    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{formatDate(date)}の出船</h2>
        {bookingsForDate.length > 0 ? groups.map(([binType, group]) => (
          <CaptainCard className={styles.binSectionCard} key={`${date}-${binType}`}>
            <div className={styles.binSectionHeader}>
              <span className={binBadgeClass(binType)}>{binLabel(binType)}</span>
              <span className={styles.subText}>{group.reduce((sum, booking) => sum + booking.count, 0)}名</span>
            </div>
            {group.map(booking => <PassengerCard key={booking.id} booking={booking} />)}
            <div className={styles.cancelRow}>
              <CaptainButton
                className={styles.cancelSailingButton}
                onClick={() => setCancelTarget({ date, bin_type: binType, bin_name: binLabel(binType) })}
                size="sm"
                variant="danger"
              >
                ⚠️ {binLabel(binType)}の出船を中止する
              </CaptainButton>
            </div>
          </CaptainCard>
        )) : <CaptainCard>{formatDate(date)}出船なし</CaptainCard>}
      </section>
    )
  }

  return (
    <PageShell title={vessel?.name || 'ダッシュボード'} menu hero={<DashboardHero />}>
      {notice && <CaptainCard className={styles.notice}>{notice}</CaptainCard>}

      <section className={styles.section}>
        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleWithBadge}`}>
          対応待ち
          {waitingCount > 0 && <span className={`${styles.countBadge} ${styles.criticalCountBadge}`}>{waitingCount}件</span>}
        </h2>
        {snsCounts.line > 0 && (
          <CaptainCard className={styles.snsCard} onClick={() => router.push('/dashboard/extract')}>
            <div className={styles.snsTitle}>
              <span>💬 LINE 未処理</span>
              <span className={`${styles.countBadge} ${styles.messageCountBadge}`}>{snsCounts.line}件</span>
            </div>
          </CaptainCard>
        )}
        {snsCounts.instagram > 0 && (
          <CaptainCard className={styles.snsCard} onClick={() => router.push('/dashboard/extract')}>
            <div className={styles.snsTitle}>
              <span>💬 Instagram 未処理</span>
              <span className={`${styles.countBadge} ${styles.messageCountBadge}`}>{snsCounts.instagram}件</span>
            </div>
          </CaptainCard>
        )}
        {contacts.map(contact => (
          <CaptainCard className={styles.contactCard} key={contact.id}>
            <div className={styles.contactLabel}>貸切問い合わせ</div>
            <div className={styles.contactTitle}>{contact.name || '名前未登録'} 様 {contact.preferred_date ? formatDate(contact.preferred_date) : ''}</div>
            <p className={styles.contactMessage}>{contact.message}</p>
            <CaptainButton className={styles.messageCheckButton} onClick={() => router.push('/dashboard/contact')}>詳細を見る</CaptainButton>
          </CaptainCard>
        ))}
        {actionable.map(booking => (
          <CaptainCard className={booking.needs_call ? styles.needsCallCard : undefined} key={booking.id}>
            <div className={styles.wrapRow}>
              {booking.needs_call && <StatusPill tone="red">要電話連絡</StatusPill>}
              {booking.status === 'pending' && <StatusPill tone="amber">承認待ち</StatusPill>}
              {booking.is_charter && <StatusPill tone="amber">貸切</StatusPill>}
            </div>
            <div className={styles.actionMeta}>{booking.name} 様 {formatDate(booking.date)} {binLabel(booking.bin_type)} {booking.count}名</div>
            {(booking.call_attempts || 0) > 0 && <p className={styles.callAttempts}>留守 {booking.call_attempts}回</p>}
            <div className={`${styles.wrapRow} ${styles.topGap}`}>
              {booking.tel && <CaptainButton className={booking.needs_call ? styles.urgentCallButton : undefined} onClick={() => beginCall(booking)}>今すぐ電話する</CaptainButton>}
              {booking.status === 'pending' && <CaptainButton className={styles.bookingCheckButton} onClick={() => updateBooking(booking, { status: 'confirmed' })}>承認する</CaptainButton>}
            </div>
          </CaptainCard>
        ))}
        {waitingCount === 0 && <CaptainCard>今すぐ対応が必要な予約はありません。</CaptainCard>}
      </section>

      <SailingSection date={today} bookingsForDate={todaysBookings} />
      <SailingSection date={tomorrow} bookingsForDate={tomorrowBookings} />

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

      {cancelTarget && (
        <div className={styles.modalOverlay}>
          <CaptainCard className={styles.modalCard}>
            <h3 className={styles.modalTitle}>{cancelTarget.bin_name}の出船を中止しますか？</h3>
            <p className={styles.modalDescription}>確定済みの乗船客全員にSMSで通知が送られます。</p>
            <div className={styles.stackActions}>
              <CaptainButton disabled={saving} onClick={cancelSailing} variant="danger">{saving ? '処理中...' : '中止する'}</CaptainButton>
              <CaptainButton onClick={() => setCancelTarget(null)} variant="secondary">キャンセル</CaptainButton>
            </div>
          </CaptainCard>
        </div>
      )}
    </PageShell>
  )
}
