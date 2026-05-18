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

// Kyokuha Design System colors
const kyokuha = {
  headerBg: '#7F1D1D',
  pageBg: '#F7F2EF',
  cardBg: '#FFFFFF',
  cardBorder: '#E8DDD8',
  primaryBtn: '#B91C1C',
  editBtnBg: '#FEF2F2',
  editBtnText: '#B91C1C',
  editBtnBorder: '#FCA5A5',
  dayBadgeBg: '#DBEAFE',
  dayBadgeText: '#1E3A8A',
  nightBadgeBg: '#EDE9FE',
  nightBadgeText: '#5B21B6',
  confirmed: '#059669',
  pending: '#D97706',
}

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: v } = await supabase
        .from('vessels').select('*').eq('user_id', session.user.id).single()
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

  if (loading) return (
    <main style={{ minHeight: '100vh', background: kyokuha.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#374151', fontSize: '16px', fontWeight: 400 }}>読み込み中...</div>
    </main>
  )

  // Booking Card Component
  const BookingCard = ({ b }: { b: Booking }) => (
    <div style={{
      background: kyokuha.cardBg,
      border: `0.5px solid ${kyokuha.cardBorder}`,
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>{b.name}</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: '20px',
            background: b.bin_type === 'day' ? kyokuha.dayBadgeBg : kyokuha.nightBadgeBg,
            color: b.bin_type === 'day' ? kyokuha.dayBadgeText : kyokuha.nightBadgeText,
          }}>
            {b.bin_type === 'day' ? '昼便' : b.bin_type === 'relay' ? '昼夜便' : '夜便'}
          </span>
        </div>
        <button
          onClick={() => router.push('/dashboard/bookings')}
          style={{
            background: kyokuha.editBtnBg,
            color: kyokuha.editBtnText,
            border: `0.5px solid ${kyokuha.editBtnBorder}`,
            borderRadius: '9px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            minHeight: 'unset',
          }}
        >
          編集
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 400, color: '#6B7280' }}>{b.count}名</span>
        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          color: b.status === 'confirmed' ? kyokuha.confirmed : kyokuha.pending,
        }}>
          {b.status === 'confirmed' ? '確定済み' : b.status === 'cancelled' ? 'キャンセル' : '承認待ち'}
        </span>
      </div>
      {b.status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => updateStatus(b.id, 'confirmed')}
            disabled={actionLoading === b.id}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 500,
              background: '#DCFCE7',
              color: kyokuha.confirmed,
              border: `0.5px solid ${kyokuha.confirmed}`,
              borderRadius: '9px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: 'unset',
            }}
          >
            承認
          </button>
          <button
            onClick={() => updateStatus(b.id, 'rejected')}
            disabled={actionLoading === b.id}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 500,
              background: '#FEF2F2',
              color: kyokuha.primaryBtn,
              border: `0.5px solid ${kyokuha.editBtnBorder}`,
              borderRadius: '9px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: 'unset',
            }}
          >
            お断り
          </button>
        </div>
      )}
      {b.status === 'confirmed' && b.tel && (
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={() => handleCall(b)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 500,
              background: kyokuha.primaryBtn,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            電話する
          </button>
        </div>
      )}
    </div>
  )

  // Day Section Component
  const DaySection = ({ label, subLabel, dateBookings }: { label: string; subLabel: string; dateBookings: Booking[] }) => {
    const dayBks = dateBookings.filter(b => b.bin_type === 'day')
    const nightBks = dateBookings.filter(b => b.bin_type === 'night' || b.bin_type === 'relay')
    const totalCount = dateBookings.reduce((sum, b) => sum + b.count, 0)
    const confirmedCount = dateBookings.filter(b => b.status === 'confirmed').length

    return (
      <div style={{
        background: kyokuha.cardBg,
        border: `0.5px solid ${kyokuha.cardBorder}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#1F2937' }}>{label}</div>
            <div style={{ fontSize: '12px', fontWeight: 400, color: '#6B7280', marginTop: '2px' }}>{subLabel}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 400, color: '#6B7280' }}>
              {confirmedCount}件 / {totalCount}名
            </div>
          </div>
        </div>
        
        {dateBookings.length === 0 ? (
          <div style={{ fontSize: '13px', fontWeight: 400, color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>
            予約はありません
          </div>
        ) : (
          <>
            {dayBks.length > 0 && (
              <div style={{ marginBottom: nightBks.length > 0 ? '12px' : '0' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: kyokuha.dayBadgeText,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{
                    background: kyokuha.dayBadgeBg,
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}>昼便</span>
                  <span style={{ color: '#6B7280' }}>{dayBks.reduce((s,b)=>s+b.count,0)}名</span>
                </div>
                {dayBks.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            )}
            {nightBks.length > 0 && (
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: kyokuha.nightBadgeText,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{
                    background: kyokuha.nightBadgeBg,
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}>夜便</span>
                  <span style={{ color: '#6B7280' }}>{nightBks.reduce((s,b)=>s+b.count,0)}名</span>
                </div>
                {nightBks.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const today = new Date()
  const tomorrow = new Date(Date.now() + 86400000)

  return (
    <div style={{
      maxWidth: '390px',
      margin: '0 auto',
      minHeight: '100vh',
      background: kyokuha.pageBg,
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Header with radial sun-ray pattern */}
      <div style={{
        background: kyokuha.headerBg,
        padding: '20px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Radial sun-ray pattern */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '400px',
          height: '400px',
          transform: 'translate(-50%, -50%)',
          background: `repeating-conic-gradient(
            from 0deg,
            rgba(255,255,255,0.1) 0deg 10deg,
            transparent 10deg 20deg
          )`,
          pointerEvents: 'none',
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#FFFFFF',
            }}>
              <img
                src={vessel?.logo_url || DEFAULT_ICON}
                alt={`${vessel?.name || 'fiShip'} ロゴ`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#FFFFFF' }}>
                {vessel?.name || '第一釣神丸'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                {today.getMonth()+1}月{today.getDate()}日（{DAY_NAMES[today.getDay()]}）
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/account')}
              aria-label="アカウント設定"
              style={{
                width: '40px',
                height: '40px',
                padding: 0,
                background: 'rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                border: '0.5px solid rgba(255,255,255,0.3)',
                borderRadius: '9px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '18px',
                minHeight: 'unset',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          </div>
          
          {/* Stats boxes */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '9px',
              padding: '10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: '#FFFFFF' }}>
                {todayBookings.length + tomorrowBookings.length}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.8)' }}>予約数</div>
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '9px',
              padding: '10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: '#FFFFFF' }}>
                {todayBookings.reduce((s,b) => s + b.count, 0) + tomorrowBookings.reduce((s,b) => s + b.count, 0)}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.8)' }}>乗船者数</div>
            </div>
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '9px',
              padding: '10px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 500, color: '#FFFFFF' }}>
                {Math.max(0, (getMaxCap('day') + getMaxCap('night')) * 2 - (todayBookings.reduce((s,b) => s + b.count, 0) + tomorrowBookings.reduce((s,b) => s + b.count, 0)))}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.8)' }}>空き数</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Pending bookings alert */}
        {pendingBookings.length > 0 && (
          <div style={{
            background: '#FEF3C7',
            border: `0.5px solid ${kyokuha.pending}`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: kyokuha.pending,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#92400E' }}>
              新しい予約が{pendingBookings.length}件届いています
            </span>
          </div>
        )}

        {/* Today's reservations */}
        <DaySection
          label="今日の予約"
          subLabel={`${today.getMonth()+1}月${today.getDate()}日（${DAY_NAMES[today.getDay()]}）`}
          dateBookings={todayBookings}
        />

        {/* Tomorrow's reservations */}
        <DaySection
          label="明日の予約"
          subLabel={`${tomorrow.getMonth()+1}月${tomorrow.getDate()}日（${DAY_NAMES[tomorrow.getDay()]}）`}
          dateBookings={tomorrowBookings}
        />

        {/* Quick action buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {[
            { icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            ), label: '予約一覧', path: '/dashboard/bookings' },
            { icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ), label: '顧客名簿', path: '/dashboard/customers' },
            { icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            ), label: '乗船名簿', path: '/dashboard/logs' },
            { icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 18h.01"/>
                <path d="M12 18h.01"/>
                <path d="M16 18h.01"/>
              </svg>
            ), label: 'スケジュール', path: '/dashboard/schedule' },
          ].map(({ icon, label, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              style={{
                padding: '14px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: kyokuha.cardBg,
                border: `0.5px solid ${kyokuha.cardBorder}`,
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                minHeight: 'unset',
                color: '#374151',
              }}
            >
              <div style={{ color: '#6B7280' }}>{icon}</div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* Add reservation button */}
        <button
          onClick={() => router.push('/dashboard/bookings/new')}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 500,
            background: kyokuha.primaryBtn,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '9px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            minHeight: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          予約を追加する
        </button>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div style={{
            background: kyokuha.cardBg,
            borderRadius: '12px',
            padding: '20px',
            width: '100%',
            maxWidth: '350px',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 500, color: '#1F2937', marginBottom: '8px' }}>
              予約を削除しますか？
            </div>
            <div style={{ fontSize: '13px', fontWeight: 400, color: '#6B7280', marginBottom: '16px', lineHeight: 1.6 }}>
              {deleteTarget.name}さん　{new Date(deleteTarget.date + 'T00:00:00').getMonth()+1}月{new Date(deleteTarget.date + 'T00:00:00').getDate()}日　{deleteTarget.bin_type === 'day' ? '昼便' : '夜便'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleDelete(deleteTarget, true)}
                disabled={deleting}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: kyokuha.primaryBtn,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  minHeight: 'unset',
                }}
              >
                削除 + 休船日に設定
              </button>
              <button
                onClick={() => handleDelete(deleteTarget, false)}
                disabled={deleting}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: kyokuha.editBtnBg,
                  color: kyokuha.primaryBtn,
                  border: `0.5px solid ${kyokuha.editBtnBorder}`,
                  borderRadius: '9px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  minHeight: 'unset',
                }}
              >
                削除のみ
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: 'transparent',
                  color: '#6B7280',
                  border: `0.5px solid ${kyokuha.cardBorder}`,
                  borderRadius: '9px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  minHeight: 'unset',
                }}
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
