'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Vessel = {
  id: string
  name: string
  captain_name: string
  prefecture: string
  port_name: string
  capacity: number
  departure_time: string
  charter_accepted: boolean
  beginner_accepted: boolean
  price: string
}

type Booking = {
  id: string
  date: string
  bin_type: string
  name: string
  tel: string
  count: number
  fishing_style: string
  status: string
  channel: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessels } = await supabase
        .from('vessels')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (!vessels) { router.push('/register'); return }
      setVessel(vessels)
      const { data: bk } = await supabase
        .from('bookings')
        .select('*')
        .eq('vessel_id', vessels.id)
        .order('date', { ascending: true })
      setBookings(bk || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getBookingsForDate = (dateStr: string) => {
    return bookings.filter(b => b.date === dateStr)
  }

  const getPendingCount = () => bookings.filter(b => b.status === 'pending').length

  const approve = async (id: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' } : b))
  }

  const reject = async (id: string) => {
    await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b))
  }

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const dayNames = ['日','月','火','水','木','金','土']

  const renderCalendar = () => {
    const fd = new Date(calYear, calM, 1).getDay()
    const tot = new Date(calYear, calM + 1, 0).getDate()
    const today = new Date()
    const cells = []

    for (let i = 0; i < fd; i++) {
      cells.push(<div key={`e${i}`} />)
    }

    for (let d = 1; d <= tot; d++) {
      const dateStr = `${calYear}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayBookings = getBookingsForDate(dateStr)
      const hasPending = dayBookings.some(b => b.status === 'pending')
      const isToday = today.getFullYear() === calYear && today.getMonth() === calM && today.getDate() === d
      const isSelected = selectedDate === dateStr
      const dow = (fd + d - 1) % 7

      cells.push(
        <div
          key={d}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            border: isSelected ? '2px solid #0A3D62' : isToday ? '2px solid #D4AC0D' : '2px solid transparent',
            minHeight: '58px',
            transition: 'all .2s',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 4px 2px',
            background: 'rgba(255,255,255,0.7)',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: dow === 0 ? '#B91C1C' : dow === 6 ? '#2E86C1' : '#111827',
            }}>{d}</span>
            {hasPending && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {dayBookings.length > 0 ? (
              <div style={{
                flex: 1,
                background: hasPending ? '#FEF9C3' : '#E8F4FD',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
              }}>
                <span style={{ fontSize: '8px', fontWeight: 700, color: hasPending ? '#854D0E' : '#0A3D62' }}>昼</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: hasPending ? '#854D0E' : '#0A3D62' }}>
                  {dayBookings.reduce((s, b) => s + b.count, 0)}名
                </span>
              </div>
            ) : (
              <div style={{ flex: 1, background: '#F8F9FA' }} />
            )}
          </div>
        </div>
      )
    }
    return cells
  }

  const selectedBookings = selectedDate ? getBookingsForDate(selectedDate) : []

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A3D62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* トップバー */}
      <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ width: '36px', height: '36px', background: '#D4AC0D', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{vessel?.name}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>{vessel?.captain_name} 船長</div>
        </div>
        {getPendingCount() > 0 && (
          <div style={{ background: '#D97706', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
            承認待ち {getPendingCount()}件
          </div>
        )}
        <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>
          ログアウト
        </button>
      </div>

      <div style={{ padding: '12px' }}>

        {/* SNS・電話メモから取込ボタン */}
        <button
          onClick={() => router.push('/dashboard/extract')}
          style={{
            width: '100%', padding: '14px 16px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#fff', border: '2px solid #E5E7EB', borderRadius: '12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#E8F4FD', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💬</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>LINEやSNSの予約を取り込む</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>メッセージを貼り付けるだけで自動入力</div>
            </div>
          </div>
          <span style={{ fontSize: '16px', color: '#9CA3AF' }}>→</span>
        </button>

        {/* カレンダー */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={() => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }}
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>◀</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{calYear}年{monthNames[calM]}</span>
            <button onClick={() => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }}
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {dayNames.map((d, i) => (
              <div key={d} style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', color: i === 0 ? '#B91C1C' : i === 6 ? '#2E86C1' : '#9CA3AF' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>
        </div>

        {/* 選択した日の予約詳細 */}
        {selectedDate && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日の予約
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }} onClick={() => setSelectedDate(null)}>✕</span>
            </div>

            {selectedBookings.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>予約はありません</div>
            ) : (
              selectedBookings.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{b.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                      {b.count}名 {b.fishing_style ? `/ ${b.fishing_style}` : ''} / {b.tel}
                    </div>
                  </div>
                  {b.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => approve(b.id)} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, background: '#D4EDDA', color: '#1B6B3A', border: '1px solid #86EFAC', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>承認</button>
                      <button onClick={() => reject(b.id)} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}>お断り</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: b.status === 'confirmed' ? '#D4EDDA' : '#F1F5F9', color: b.status === 'confirmed' ? '#1B6B3A' : '#6B7280' }}>
                      {b.status === 'confirmed' ? '承認済み' : 'お断り'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}