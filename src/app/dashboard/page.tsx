'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Vessel = {
  id: string
  name: string
  captain_name: string
  capacity: number
}

type Booking = {
  id: string
  date: string
  bin_type: 'day' | 'night'
  name: string
  tel: string
  count: number
  fishing_style: string
  message: string
  status: 'pending' | 'confirmed' | 'rejected'
  channel: string
  contacted: boolean
}

type BinSetting = {
  id: string
  vessel_id: string
  bin_type: 'day' | 'night'
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

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const todayBookings = bookings.filter(b => b.date === todayStr && b.status !== 'rejected')
  const tomorrowBookings = bookings.filter(b => b.date === tomorrowStr && b.status !== 'rejected')
  const tomorrowUncontacted = tomorrowBookings.filter(b => b.status === 'confirmed' && !b.contacted)

  const getMaxCap = (binType: string) => {
    const bin = binSettings.find(b => b.bin_type === binType)
    return bin?.max_capacity ?? 0
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>{b.name}</div>
        <div style={{ fontSize: '16px', color: 'var(--fg-2)', marginTop: '2px' }}>{b.count}名　{b.status === 'confirmed' ? '承認済み' : '承認待ち'}</div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {b.contacted ? (
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-ok-fg)', background: 'var(--status-ok-bg)', padding: '6px 12px', borderRadius: '99px' }}>✅ 連絡済み</span>
        ) : (
          <button
            onClick={() => toggleContacted(b)}
            style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', background: 'var(--surface)', border: '2px solid var(--border)', padding: '6px 12px', borderRadius: '99px', cursor: 'pointer', fontFamily: 'inherit' }}
          >未連絡</button>
        )}
        {b.tel && (
          <button
            onClick={() => handleCall(b)}
            style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--status-day-bg)', border: '2px solid var(--ocean-light)', color: 'var(--ocean)', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >📞</button>
        )}
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
    const nightBks = dateBookings.filter(b => b.bin_type === 'night')
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '12px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>{label}</div>
        {dayBks.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '4px' }}>
              ☀️ 昼便　{dayBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('day')}名
            </div>
            {dayBks.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
        {nightBks.length > 0 && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-night-fg)', marginBottom: '4px' }}>
              🌙 夜便　{nightBks.reduce((s,b)=>s+b.count,0)}名／{getMaxCap('night')}名
            </div>
            {nightBks.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: oceanGradient, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 20, minHeight: '80px' }}>
        <div style={{ width: '56px', height: '56px', background: 'var(--surface)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: 'var(--ocean)', flexShrink: 0 }}>fi</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vessel?.name}</div>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,.86)', marginTop: '4px' }}>{vessel?.captain_name}</div>
        </div>
        <button
          onClick={() => router.push('/dashboard/account')}
          aria-label="アカウント設定"
          style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', color: 'var(--surface)', fontSize: '22px', cursor: 'pointer' }}
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
            { icon: '⚙️', label: '便の設定', path: '/dashboard/settings' },
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
    </div>
  )
}
