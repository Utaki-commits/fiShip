'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CaptainButton, CaptainCard } from '@/components/captain-ui'
import CaptainHeader from '@/components/CaptainHeader'
import { PageShell, LoadingScreen, StatusPill, binLabel, formatDate, toDateStr } from './_components/CaptainShell'
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
type Contact = { id: string; name: string; tel: string | null; message: string; preferred_date: string | null; is_charter: boolean; is_negotiating: boolean }
type CancelTarget = { date: string; bin_type: 'day' | 'night' | 'relay'; bin_name: string }
type BinSetting = {
  bin_type: 'day' | 'night' | 'relay'
  meeting_time: string | null
  departure_time: string | null
  fish_types: string[] | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [snsCounts, setSnsCounts] = useState({ line: 0, instagram: 0 })
  const [callTarget, setCallTarget] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
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

      const [{ data: bk }, { data: bs }, { data: ct }, { count: lineCount }, { count: instagramCount }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', v.id).gte('date', today).neq('status', 'rejected').order('date', { ascending: true }),
        supabase.from('bin_settings').select('bin_type, meeting_time, departure_time, fish_types').eq('vessel_id', v.id),
        supabase.from('contacts').select('*').eq('vessel_id', v.id).eq('is_charter', true).eq('is_negotiating', true).order('created_at', { ascending: false }),
        supabase.from('sns_messages').select('id', { count: 'exact', head: true }).eq('vessel_id', v.id).eq('channel', 'line').eq('status', 'unprocessed'),
        supabase.from('sns_messages').select('id', { count: 'exact', head: true }).eq('vessel_id', v.id).eq('channel', 'instagram').eq('status', 'unprocessed'),
      ])
      setBookings((bk || []) as Booking[])
      setBinSettings((bs || []) as BinSetting[])
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

  const beginContactCall = (contact: Contact) => {
    if (!contact.tel) return
    window.location.href = `tel:${contact.tel}`
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
  const tomorrowBookings = bookings.filter(b => b.date === tomorrow && (b.status === 'confirmed' || b.status === 'pending'))
  const nextBooking = bookings.find(b => b.date > tomorrow && b.status === 'confirmed')
  const importantBookings = actionable.filter(b => b.needs_call)
  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const messageCount = snsCounts.line + snsCounts.instagram
  const waitingCount = contacts.length + actionable.length + snsCounts.line + snsCounts.instagram
  const groupByBin = (items: Booking[]) => (Object.entries(items.reduce<Record<string, Booking[]>>((acc, booking) => {
    acc[booking.bin_type] = [...(acc[booking.bin_type] || []), booking]
    return acc
  }, {})) as Array<['day' | 'night' | 'relay', Booking[]]>)
  const todayGroups = groupByBin(todaysBookings)
  const tomorrowGroups = groupByBin(tomorrowBookings)
  const totalPeople = (items: Booking[]) => items.reduce((sum, booking) => sum + booking.count, 0)
  const binSettingFor = (binType: string) => binSettings.find(setting => setting.bin_type === binType)
  const formatTime = (time?: string | null) => time ? time.slice(0, 5).replace(/^0/, '') : '未設定'
  const fishingStyleFor = (items: Booking[], binType: string) => {
    const bookingStyle = items.find(booking => booking.fishing_style)?.fishing_style
    const settingStyle = binSettingFor(binType)?.fish_types?.[0]
    return bookingStyle || settingStyle || '釣種未設定'
  }
  const timeLabelFor = (binType: string) => {
    const setting = binSettingFor(binType)
    return `${formatTime(setting?.meeting_time)}集合・${formatTime(setting?.departure_time)}出港`
  }
  const contactProgress = (items: Booking[]) => {
    if (items.length === 0) return '連絡なし'
    const contacted = items.filter(booking => booking.contacted).length
    return `${contacted}/${items.length} 連絡済み`
  }
  const binBadgeClass = (binType: string) => {
    if (binType === 'night') return `${styles.binBadge} ${styles.nightBadge}`
    if (binType === 'relay') return `${styles.binBadge} ${styles.relayBadge}`
    return `${styles.binBadge} ${styles.dayBadge}`
  }
  const binIcon = (binType: string) => {
    if (binType === 'night') return '🌙'
    if (binType === 'relay') return '🔄'
    return '☀️'
  }

  return (
    <PageShell title={vessel?.name || 'ダッシュボード'} menu hero={vessel?.id ? <CaptainHeader vesselId={vessel.id} /> : undefined}>
      {notice && <CaptainCard className={styles.notice}>{notice}</CaptainCard>}

      <section className={styles.summaryCard}>
        <div className={styles.cardHeader}>
          <span className={styles.headerIcon}>⚓</span>
          <h2>本日の確認</h2>
        </div>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryItem} ${styles.summaryToday}`}>
            <span className={styles.summaryCircle}>今</span>
            <span className={styles.summaryLabel}>今日の便数</span>
            <strong>{todayGroups.length}</strong>
          </div>
          <div className={`${styles.summaryItem} ${styles.summaryTomorrow}`}>
            <span className={styles.summaryCircle}>明</span>
            <span className={styles.summaryLabel}>明日の便数</span>
            <strong>{tomorrowGroups.length}</strong>
          </div>
          <div className={`${styles.summaryItem} ${styles.summaryImportant}`}>
            <span className={styles.summaryCircle}>!</span>
            <span className={styles.summaryLabel}>最重要</span>
            <strong>{importantBookings.length}</strong>
          </div>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.importantPanel}`}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleWrap}>
            <span className={`${styles.countBadge} ${styles.criticalCountBadge}`}>★ 最重要</span>
          </div>
          {importantBookings.length > 0 && <span className={`${styles.countBadge} ${styles.criticalCountBadge}`}>{importantBookings.length}件</span>}
        </div>
        {importantBookings.length > 0 ? importantBookings.slice(0, 2).map(booking => (
          <div className={styles.importantItem} key={booking.id}>
            <div className={styles.phoneIcon}>☎</div>
            <div className={styles.importantBody}>
              <div className={styles.importantName}>{booking.name} 様</div>
              <div className={styles.importantReason}>{booking.needs_call_reason || '電話連絡が必要です'}</div>
              <div className={styles.importantMeta}>{formatDate(booking.date)}・{binLabel(booking.bin_type)}・{booking.count}名</div>
            </div>
            {booking.tel && <CaptainButton className={styles.urgentCallButton} onClick={() => beginCall(booking)}>電話</CaptainButton>}
          </div>
        )) : <div className={styles.emptyText}>最重要の対応はありません。</div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleWrap}>
            <span className={styles.headerIcon}>🚢</span>
            <h2>今日の出船</h2>
          </div>
        </div>
        {todayGroups.length > 0 ? todayGroups.map(([binType, group]) => (
          <div className={styles.sailingCard} key={`${today}-${binType}`}>
            <div className={styles.binIcon}>{binIcon(binType)}</div>
            <div className={styles.sailingBody}>
              <div className={styles.sailingTitle}>{binLabel(binType)} <span>{fishingStyleFor(group, binType)}</span></div>
              <div className={styles.sailingMeta}>{totalPeople(group)}名・{timeLabelFor(binType)}</div>
              <div className={styles.wrapRow}>
                <span className={`${styles.countBadge} ${styles.messageCountBadge}`}>{contactProgress(group)}</span>
              </div>
            </div>
            <CaptainButton className={styles.navyButton} onClick={() => router.push('/dashboard/logs')}>名簿</CaptainButton>
          </div>
        )) : <div className={styles.emptyText}>{formatDate(today)} 出船なし</div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleWrap}>
            <span className={styles.headerIcon}>📅</span>
            <h2>明日の準備</h2>
          </div>
        </div>
        {tomorrowGroups.length > 0 ? tomorrowGroups.map(([binType, group]) => (
          <div className={styles.prepareCard} key={`${tomorrow}-${binType}`}>
            <div className={styles.binIcon}>{binIcon(binType)}</div>
            <div className={styles.sailingBody}>
              <div className={styles.sailingTitle}>{binLabel(binType)} <span>{fishingStyleFor(group, binType)}</span></div>
              <div className={styles.sailingMeta}>{totalPeople(group.filter(booking => booking.status === 'confirmed')) || totalPeople(group)}名</div>
              <div className={styles.wrapRow}>
                {group.some(booking => !booking.contacted) && <span className={`${styles.countBadge} ${styles.goldCountBadge}`}>未送信 {group.filter(booking => !booking.contacted).length}件</span>}
                {group.some(booking => booking.status === 'pending') && <span className={`${styles.countBadge} ${styles.goldCountBadge}`}>承認 {group.filter(booking => booking.status === 'pending').length}件</span>}
                {!group.some(booking => booking.status === 'pending') && <span className={`${styles.countBadge} ${styles.bookingCountBadge}`}>承認済み</span>}
              </div>
            </div>
            <div className={styles.prepareActions}>
              <CaptainButton className={styles.goldButton} onClick={() => router.push('/dashboard/bookings')}>連絡</CaptainButton>
              <CaptainButton onClick={() => router.push('/dashboard/bookings')} variant="secondary">詳細</CaptainButton>
            </div>
          </div>
        )) : <div className={styles.emptyText}>{formatDate(tomorrow)} 出船なし</div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleWrap}>
            <span className={styles.headerIcon}>👤</span>
            <h2>予約対応</h2>
          </div>
          {contacts.length + pendingBookings.length > 0 && <span className={`${styles.countBadge} ${styles.bookingCountBadge}`}>{contacts.length + pendingBookings.length}件</span>}
        </div>
        <div className={styles.supportRow}>
          <span className={`${styles.countBadge} ${styles.blueCountBadge}`}>貸切 {contacts.length}件</span>
          <span className={`${styles.countBadge} ${styles.goldCountBadge}`}>承認 {pendingBookings.length}件</span>
        </div>
        {contacts.length > 0 && (
          <div className={styles.charterList}>
            {contacts.slice(0, 3).map(contact => (
              <div className={styles.charterItem} key={contact.id}>
                <div className={styles.charterBody}>
                  <div className={styles.charterName}>{contact.name} 様</div>
                  <div className={styles.charterMeta}>
                    {contact.preferred_date ? `${formatDate(contact.preferred_date)}・` : ''}{contact.tel || '電話番号未入力'}
                  </div>
                  {contact.message && <div className={styles.charterMessage}>{contact.message}</div>}
                </div>
                {contact.tel && <CaptainButton className={styles.navyButton} onClick={() => beginContactCall(contact)}>電話</CaptainButton>}
              </div>
            ))}
          </div>
        )}
        <CaptainButton className={styles.bookingCheckButton} onClick={() => router.push('/dashboard/bookings')}>確認</CaptainButton>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleWrap}>
            <span className={styles.headerIcon}>💬</span>
            <h2>メッセージ</h2>
          </div>
          {messageCount > 0 && <span className={`${styles.countBadge} ${styles.messageCountBadge}`}>{messageCount}件</span>}
        </div>
        <div className={styles.messageRow}>
          <span>LINE {snsCounts.line}件</span>
          <span>Instagram {snsCounts.instagram}件</span>
        </div>
        <CaptainButton className={styles.messageCheckButton} onClick={() => router.push('/dashboard/extract')}>確認</CaptainButton>
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
