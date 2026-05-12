'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

type Vessel = {
  id: string
  name: string
  captain_name: string
  capacity: number
  logo_url: string
  banner_url: string
}

type Booking = {
  id: string
  date: string
  bin_type: 'day' | 'night' | 'relay'
  name: string
  tel: string
  count: number
  fishing_style: string
  message: string
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  channel: string
  contacted: boolean
}

type BinSetting = {
  id: string
  vessel_id: string
  bin_type: 'day' | 'night' | 'relay'
  max_capacity: number
  days_of_week: number[]
  start_month: number
  end_month: number
}

const DAY_NAMES = ['日','月','火','水','木','金','土']
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const todayStr = toDateStr(new Date())
  const tomorrowStr = toDateStr(new Date(Date.now() + 86400000))

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      if (!res.ok) { router.push('/login'); return }

      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }

      const { data: v } = await supabase
        .from('vessels').select('*').eq('user_id', user.sub).single()
      if (!v) { router.push('/register'); return }
      setVessel(v)

      const [{ data: bk }, { data: bs }] = await Promise.all([
        supabase.from('bookings').select('*')
          .eq('vessel_id', v.id)
          .gte('date', todayStr)
          .order('date', { ascending: true }),
        supabase.from('bin_settings').select('*').eq('vessel_id', v.id),
      ])
      setBookings(bk || [])
      setBinSettings(bs || [])
      setLoading(false)
    }
    init()
  }, [router, todayStr])

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleCall = async (booking: Booking) => {
    window.location.href = `tel:${booking.tel}`
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, contacted: true }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, contacted: true } : b))
    }
  }

  const toggleContacted = async (booking: Booking) => {
    const next = !booking.contacted
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, contacted: next }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, contacted: next } : b))
    }
  }

  const handleCancel = async (booking: Booking) => {
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, status: 'cancelled' }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b))
    }
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

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const getPendingCount = () => pendingBookings.length
  const todayBookings = bookings.filter(b => b.date === todayStr && b.status !== 'rejected')
  const tomorrowBookings = bookings.filter(b => b.date === tomorrowStr && b.status !== 'rejected')
  const tomorrowUncontacted = tomorrowBookings.filter(b => b.status === 'confirmed' && !b.contacted)

  const getMaxCap = (binType: string) => {
    const bin = binSettings.find(b => b.bin_type === binType)
    return bin?.max_capacity ?? 0
  }

  const getChannelBadge = (channel: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      page: { label: '📱 予約ページ', bg: 'var(--status-day-bg)', color: 'var(--ocean)' },
      line: { label: '💬 LINE', bg: '#E8F8EE', color: '#06C755' },
      line_official: { label: '💬 LINE公式', bg: '#E8F8EE', color: '#06C755' },
      instagram: { label: '📸 Instagram', bg: '#FDE8F4', color: '#C13584' },
      phone: { label: '電話', bg: 'var(--status-closed-bg)', color: 'var(--fg-2)' },
      other: { label: 'その他', bg: 'var(--status-closed-bg)', color: 'var(--fg-2)' },
    }
    const badge = map[channel] || map.other
    return (
      <span style={{ fontSize: '13px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: badge.bg, color: badge.color }}>
        {badge.label}
      </span>
    )
  }

  const oceanGradient =
    'radial-gradient(120% 200% at 88% 110%, rgba(46,134,193,.45) 0%, transparent 55%),' +
    'radial-gradient(80% 120% at 12% -20%, rgba(212,172,13,.18) 0%, transparent 60%),' +
    'linear-gradient(180deg, var(--ocean) 0%, #0F4570 55%, #04192B 100%)'

  if (loading) return (
    <main style={{ minHeight: '100vh', background: oceanGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '18px' }}>読み込み中...</div>
    </main>
  )

  const PendingCard = ({ b }: { b: Booking }) => (
    <div style={{ background: 'var(--surface)', border: '2px solid var(--status-pending-dot)', borderRadius: '14px', padding: '18px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, padding: '6px 12px', borderRadius: '99px', flexShrink: 0, background: b.bin_type === 'day' ? 'var(--status-day-bg)' : 'var(--status-night-bg)', color: b.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)' }}>
          {b.bin_type === 'day' ? '昼便' : '夜便'}
        </span>
        {getChannelBadge(b.channel)}
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--fg-1)' }}>{b.name}</div>
          <div style={{ fontSize: '18px', color: 'var(--fg-2)', marginTop: '4px' }}>
            {b.count}名　{new Date(b.date + 'T00:00:00').getMonth()+1}月{new Date(b.date + 'T00:00:00').getDate()}日（{DAY_NAMES[new Date(b.date + 'T00:00:00').getDay()]}）
          </div>
          {b.fishing_style && <div style={{ fontSize: '16px', color: 'var(--fg-2)', marginTop: '2px' }}>{b.fishing_style}</div>}
          {b.message && <div style={{ fontSize: '16px', color: 'var(--fg-2)', marginTop: '2px' }}>{b.message}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => updateStatus(b.id, 'confirmed')}
          disabled={actionLoading === b.id}
          style={{ flex: 1, padding: '16px', fontSize: '20px', fontWeight: 700, minHeight: '56px', background: 'var(--status-ok-bg)', color: 'var(--status-ok-fg)', border: '2px solid var(--status-ok-bd)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >{actionLoading === b.id ? '処理中...' : '承認する'}</button>
        <button
          onClick={() => updateStatus(b.id, 'rejected')}
          disabled={actionLoading === b.id}
          style={{ flex: 1, padding: '16px', fontSize: '20px', fontWeight: 700, minHeight: '56px', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >お断り</button>
      </div>
    </div>
  )

  const BookingCard = ({ b }: { b: Booking }) => (
    <div key={b.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
          background: b.bin_type === 'day' ? 'var(--status-day-bg)' : b.bin_type === 'relay' ? 'var(--ocean-pale)' : 'var(--status-night-bg)',
          color: b.bin_type === 'day' ? 'var(--ocean)' : b.bin_type === 'relay' ? 'var(--ocean)' : 'var(--status-night-fg)',
        }}>
          {b.bin_type === 'day' ? '昼便' : b.bin_type === 'relay' ? '昼夜便' : '夜便'}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {b.status === 'confirmed' && b.tel && (
            <button onClick={() => handleCall(b)}
              style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-day-bg)', color: 'var(--ocean)', border: '2px solid var(--ocean-light)', borderRadius: '8px', cursor: 'pointer' }}>
              TEL
            </button>
          )}
          {b.status === 'confirmed' && (
            <button onClick={() => toggleContacted(b)}
              style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: b.contacted ? 'var(--status-ok-bg)' : 'var(--surface)', color: b.contacted ? 'var(--status-ok-fg)' : 'var(--fg-3)', border: `2px solid ${b.contacted ? 'var(--status-ok-bd)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer' }}>
              {b.contacted ? '連絡済' : '未連絡'}
            </button>
          )}
          {b.status === 'pending' && (
            <>
              <button onClick={() => updateStatus(b.id, 'confirmed')}
                style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-ok-bg)', color: 'var(--status-ok-fg)', border: '2px solid var(--status-ok-bd)', borderRadius: '8px', cursor: 'pointer' }}>
                承認
              </button>
              <button onClick={() => updateStatus(b.id, 'rejected')}
                style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: 'pointer' }}>
                お断り
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          {b.status !== 'cancelled' && (
            <button onClick={() => router.push('/dashboard/bookings')}
              style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--ocean)', border: '2px solid var(--ocean-light)', borderRadius: '8px', cursor: 'pointer' }}>
              編集
            </button>
          )}
          {b.status === 'confirmed' && (
            <button onClick={() => handleCancel(b)}
              style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: 'pointer' }}>
              取消
            </button>
          )}
          {b.status === 'cancelled' && (
            <button onClick={() => setDeleteTarget(b)}
              style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: 'pointer' }}>
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const DaySection = ({ label, dateBookings }: { label: string, dateBookings: Booking[] }) => {
    if (dateBookings.length === 0) return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '16px', color: 'var(--fg-3)' }}>予約はありません</div>
      </div>
    )
    const dayBks = dateBookings.filter(b => b.bin_type === 'day')
    const relayBks = dateBookings.filter(b => b.bin_type === 'relay')
    const nightBks = dateBookings.filter(b => b.bin_type === 'night')
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>{label}</div>
        {dayBks.length > 0 && (
          <div style={{ marginBottom: relayBks.length > 0 || nightBks.length > 0 ? '12px' : '0' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '4px' }}>
              昼便　{dayBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('day')}名
            </div>
            {dayBks.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
        {relayBks.length > 0 && (
          <div style={{ marginBottom: nightBks.length > 0 ? '12px' : '0' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '4px' }}>
              昼夜便　{relayBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('relay')}名
            </div>
            {relayBks.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
        {nightBks.length > 0 && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-night-fg)', marginBottom: '4px' }}>
              夜便　{nightBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('night')}名
            </div>
            {nightBks.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{
        background: vessel?.banner_url
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${vessel.banner_url})`
          : oceanGradient,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        position: 'sticky', top: 0, zIndex: 20, minHeight: '80px',
        overflow: 'hidden', isolation: 'isolate'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '12px',
          overflow: 'hidden', flexShrink: 0,
        }}>
          <img src={vessel?.logo_url || DEFAULT_ICON} alt={`${vessel?.name || 'fiShip'} ロゴ`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{vessel?.name}</div>
          <div style={{ fontSize: '18px', color: '#ffffff', marginTop: '4px', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{vessel?.captain_name}</div>
        </div>
        {getPendingCount() > 0 && (
          <div style={{
            background: 'rgba(212,172,13,.18)', color: 'var(--gold)',
            fontSize: '14px', fontWeight: 700, padding: '10px 14px',
            border: '2px solid rgba(242,199,68,.55)', borderRadius: '99px',
            whiteSpace: 'nowrap', minHeight: '44px', display: 'flex', alignItems: 'center',
            position: 'relative', zIndex: 3,
          }}>
            承認待ち {getPendingCount()}件
          </div>
        )}
        <button
          onClick={() => router.push('/dashboard/account')}
          aria-label="アカウント設定"
          style={{ width: '56px', height: '56px', padding: 0, background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '22px' }}
        >⚙️</button>
      </div>

      <div style={{ padding: '16px' }}>
        {pendingBookings.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-pending-dot)' }} />
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>新しい予約が{pendingBookings.length}件届いています</span>
            </div>
            {pendingBookings.map(b => <PendingCard key={b.id} b={b} />)}
          </div>
        )}

        {tomorrowBookings.length > 0 && (
          <div style={{
            background: tomorrowUncontacted.length === 0 ? 'var(--status-ok-bg)' : 'var(--status-pending-bg)',
            border: `2px solid ${tomorrowUncontacted.length === 0 ? 'var(--status-ok-bd)' : 'var(--status-pending-dot)'}`,
            borderRadius: '14px', padding: '16px 18px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ fontSize: '28px' }}>{tomorrowUncontacted.length === 0 ? '✅' : '⚠️'}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: tomorrowUncontacted.length === 0 ? 'var(--status-ok-fg)' : 'var(--status-pending-fg)' }}>
                {tomorrowUncontacted.length === 0 ? '明日の乗船者全員に連絡済みです' : `明日の乗船者に連絡しましたか？　未連絡${tomorrowUncontacted.length}名`}
              </div>
            </div>
          </div>
        )}

        <DaySection
          label={`今日　${new Date().getMonth()+1}月${new Date().getDate()}日（${DAY_NAMES[new Date().getDay()]}）`}
          dateBookings={todayBookings}
        />
        <DaySection
          label={`明日　${new Date(Date.now()+86400000).getMonth()+1}月${new Date(Date.now()+86400000).getDate()}日（${DAY_NAMES[new Date(Date.now()+86400000).getDay()]}）`}
          dateBookings={tomorrowBookings}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { icon: '📅', label: '予約一覧', path: '/dashboard/bookings' },
            { icon: '👥', label: '顧客名簿', path: '/dashboard/customers' },
            { icon: '📋', label: '乗船名簿', path: '/dashboard/logs' },
            { icon: '🗓️', label: 'スケジュール', path: '/dashboard/schedule' },
          ].map(({ icon, label, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '14px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '90px' }}
            >
              <div style={{ fontSize: '28px' }}>{icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-1)', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '8px' }}>
              予約を削除しますか？
            </div>
            <div style={{ fontSize: '15px', color: 'var(--fg-2)', marginBottom: '20px', lineHeight: 1.7 }}>
              {deleteTarget.name}さん　{new Date(deleteTarget.date + 'T00:00:00').getMonth()+1}月{new Date(deleteTarget.date + 'T00:00:00').getDate()}日　{deleteTarget.bin_type === 'day' ? '昼便' : '夜便'}
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
    </div>
  )
}
