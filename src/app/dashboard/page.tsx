'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getHolidayInfo } from '@/lib/holidays'

type Vessel = {
  id: string
  name: string
  captain_name: string
  capacity: number
  departure_time: string
}

type Booking = {
  id: string
  date: string
  bin_type: string
  name: string
  tel: string
  count: number
  fishing_style: string
  message: string
  status: string
  channel: string
}

type BinSetting = {
  id: string
  vessel_id: string
  bin_type: 'day' | 'night'
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  fish_types: string[]
  max_capacity: number
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES = ['日','月','火','水','木','金','土']

// Date → YYYY-MM-DD
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// 週の日曜日を取得
const getWeekSunday = (d: Date) => {
  const sun = new Date(d)
  sun.setDate(d.getDate() - d.getDay())
  sun.setHours(0, 0, 0, 0)
  return sun
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calM, setCalM] = useState(new Date().getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekSunday(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: v } = await supabase
        .from('vessels').select('*').eq('user_id', session.user.id).single()
      if (!v) { router.push('/register'); return }
      setVessel(v)
      const [{ data: bk }, { data: bs }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', v.id).order('date', { ascending: true }),
        supabase.from('bin_settings').select('*').eq('vessel_id', v.id),
      ])
      setBookings(bk || [])
      setBinSettings(bs || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

  const getPendingCount = () => bookings.filter(b => b.status === 'pending').length

  const switchView = (nextView: 'month' | 'week') => {
    if (nextView === 'week') {
      const baseDate = selectedDate
        ? new Date(selectedDate + 'T00:00:00')
        : new Date(calYear, calM, 1)
      setWeekStart(getWeekSunday(baseDate))
    }
    setView(nextView)
  }

  const renderCalendar = () => {
    const getBinsForDate = (year: number, month: number, day: number) => {
      const dow = new Date(year, month, day).getDay()
      return binSettings.filter(bin => {
        const isInPeriod = bin.start_month <= bin.end_month
          ? bin.start_month <= month && month <= bin.end_month
          : month >= bin.start_month || month <= bin.end_month
        const inDay = bin.days_of_week.map(Number).includes(dow)
        return isInPeriod && inDay
      })
    }

    const getRemaining = (dateStr: string, binType: string, maxCap: number) => {
      const used = bookings
        .filter(b => b.date === dateStr && b.bin_type === binType && (b.status === 'confirmed' || b.status === 'pending'))
        .reduce((sum, b) => sum + b.count, 0)
      return maxCap - used
    }

    const renderCell = (year: number, month: number, day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const todayStr = toDateStr(new Date())
      const isToday = dateStr === todayStr
      const isSelected = selectedDate === dateStr
      const dow = new Date(year, month, day).getDay()

      const bins = getBinsForDate(year, month, day)
      const dayBin = bins.find(b => b.bin_type === 'day') ?? null
      const nightBin = bins.find(b => b.bin_type === 'night') ?? null
      const hasPending = bookings.some(b => b.date === dateStr && b.status === 'pending')
      const holiday = getHolidayInfo(new Date(year, month, day))

      let dayBg = 'var(--status-day-bg)'
      let dayLabel: string | null = null
      let dayTextColor = 'var(--ocean)'
      if (dayBin) {
        const rem = getRemaining(dateStr, 'day', dayBin.max_capacity)
        if (rem <= 0) {
          dayBg = 'var(--status-full-bg)'; dayLabel = '満員'; dayTextColor = 'var(--status-full-fg)'
        } else {
          dayLabel = `昼　残${rem}`
          dayTextColor = rem <= 2 ? 'var(--status-full-fg)' : 'var(--ocean)'
        }
      }

      let nightBg = 'var(--status-night-bg)'
      let nightLabel: string | null = null
      let nightTextColor = 'var(--status-night-fg)'
      if (nightBin) {
        const rem = getRemaining(dateStr, 'night', nightBin.max_capacity)
        if (rem <= 0) {
          nightBg = 'var(--status-full-bg)'; nightLabel = '満員'; nightTextColor = 'var(--status-full-fg)'
        } else {
          nightLabel = `夜　残${rem}`
          nightTextColor = rem <= 2 ? 'var(--status-full-fg)' : 'var(--status-night-fg)'
        }
      }

      return (
        <div
          key={dateStr}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
          style={{
            borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            cursor: 'pointer', minHeight: '80px', transition: 'border-color .15s',
            border: isSelected ? '2px solid var(--ocean)' : isToday ? '2px solid var(--gold)' : '2px solid transparent',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '3px 4px', flexShrink: 0,
            background: !dayBin && !nightBin ? 'var(--bg)' : 'var(--surface)',
            borderBottom: (dayBin || nightBin) ? '1px solid rgba(0,0,0,0.05)' : 'none',
          }}>
            <div>
              <span style={{
                fontSize: '14px', fontWeight: 700,
                color: (holiday || dow === 0) ? 'var(--status-full-fg)' : dow === 6 ? 'var(--ocean-light)' : 'var(--fg-1)',
              }}>{day}</span>
              {holiday && (
                <div style={{ fontSize: '14px', color: 'var(--status-full-fg)', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '30px' }}>
                  {holiday.name}
                </div>
              )}
            </div>
            {hasPending && (
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-pending-dot)', flexShrink: 0, marginTop: '2px' }} />
            )}
          </div>

          {!dayBin && !nightBin ? (
            <div style={{ flex: 1, background: 'var(--bg)' }} />
          ) : (
            <>
              {dayBin && (
                <div style={{
                  flex: 1, background: dayBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: nightBin ? '1px solid rgba(0,0,0,0.06)' : undefined,
                }}>
                  {dayLabel && (
                    <span style={{ fontSize: '14px', fontWeight: 700, color: dayTextColor, whiteSpace: 'nowrap' }}>
                      {dayLabel}
                    </span>
                  )}
                </div>
              )}
              {nightBin && (
                <div style={{
                  flex: 1, background: nightBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {nightLabel && (
                    <span style={{ fontSize: '14px', fontWeight: 700, color: nightTextColor, whiteSpace: 'nowrap' }}>
                      {nightLabel}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    if (view === 'month') {
      const firstDow = new Date(calYear, calM, 1).getDay()
      const totalDays = new Date(calYear, calM + 1, 0).getDate()
      const cells = []
      for (let i = 0; i < firstDow; i++) {
        cells.push(<div key={`e${i}`} style={{ minHeight: '80px' }} />)
      }
      for (let d = 1; d <= totalDays; d++) {
        cells.push(renderCell(calYear, calM, d))
      }
      return cells
    }

    const cells = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      cells.push(renderCell(d.getFullYear(), d.getMonth(), d.getDate()))
    }
    return cells
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getFullYear()}年${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}〜${weekEnd.getDate()}日`
    : `${MONTH_NAMES[weekStart.getMonth()]}${weekStart.getDate()}日〜${MONTH_NAMES[weekEnd.getMonth()]}${weekEnd.getDate()}日`

  const selectedBookings = selectedDate
    ? bookings
        .filter(b => b.date === selectedDate && b.status !== 'rejected')
        .sort((a, b) => (a.bin_type === b.bin_type ? 0 : a.bin_type === 'day' ? -1 : 1))
    : []

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif' }}>

      {/* トップバー */}
      <div style={{ background: 'var(--ocean)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ width: '36px', height: '36px', background: 'var(--gold)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⚓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--surface)' }}>{vessel?.name}</div>
        </div>
        {getPendingCount() > 0 && (
          <div style={{ background: 'var(--status-pending-dot)', color: 'var(--surface)', fontSize: '14px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
            承認待ち {getPendingCount()}件
          </div>
        )}
        <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '14px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: 'var(--surface)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          ログアウト
        </button>
      </div>

      <div style={{ padding: '12px' }}>

        {/* 出船スケジュール未設定バナー */}
        {binSettings.length === 0 && (
          <div
            onClick={() => router.push('/dashboard/settings')}
            style={{
              background: 'var(--status-pending-bg)', border: '1px solid var(--status-pending-dot)', borderRadius: '12px',
              padding: '14px 16px', marginBottom: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <div style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-pending-fg)' }}>出船スケジュールが未設定です</div>
              <div style={{ fontSize: '14px', color: 'var(--status-pending-fg)', marginTop: '2px' }}>タップして昼便・夜便のスケジュールを登録してください</div>
            </div>
          </div>
        )}

        {/* クイックアクションボタン */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {[
            { icon: '💬', bg: 'var(--status-day-bg)', label: 'SNS・電話から\n取り込む', path: '/dashboard/extract' },
            { icon: '👥', bg: 'var(--status-ok-bg)', label: '顧客名簿\nを見る', path: '/dashboard/customers' },
            { icon: '📋', bg: 'var(--status-pending-bg)', label: '乗船名簿\nを記録する', path: '/dashboard/logs' },
            { icon: '⚙️', bg: 'var(--status-night-bg)', label: '便の設定\nを変更する', path: '/dashboard/settings' },
            { icon: '🔗', bg: 'var(--status-pending-bg)', label: '予約リンク\nを共有する', path: '/dashboard/vessel' },
          ].map(({ icon, bg, label, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              style={{
                padding: '12px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '12px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
              }}
            >
              <div style={{ width: '36px', height: '36px', background: bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-1)', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* カレンダー */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>

          {/* ヘッダー：ナビ・タイトル・月/週トグル */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={view === 'month'
                ? () => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }
                : () => setWeekStart(d => { const p = new Date(d); p.setDate(d.getDate() - 7); return p })
              }
              style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}
            >◀</button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)' }}>
                {view === 'month' ? `${calYear}年${MONTH_NAMES[calM]}` : weekLabel}
              </span>
              {/* 月 / 週 切り替えトグル */}
              <div style={{ display: 'flex', background: 'var(--status-closed-bg)', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                {(['month', 'week'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => switchView(v)}
                    style={{
                      padding: '4px 16px', fontSize: '14px', fontWeight: 700,
                      background: view === v ? 'var(--surface)' : 'transparent',
                      color: view === v ? 'var(--ocean)' : 'var(--fg-3)',
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: view === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
                      transition: 'all .15s',
                    }}
                  >{v === 'month' ? '月' : '週'}</button>
                ))}
              </div>
            </div>

            <button
              onClick={view === 'month'
                ? () => { if (calM === 11) { setCalM(0); setCalYear(y => y + 1) } else setCalM(m => m + 1) }
                : () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n })
              }
              style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}
            >▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ fontSize: '14px', fontWeight: 700, textAlign: 'center', color: i === 0 ? 'var(--status-full-fg)' : i === 6 ? 'var(--ocean-light)' : 'var(--fg-3)' }}>{d}</div>
            ))}
          </div>

          {/* セルグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[
              { bg: 'var(--status-day-bg)', color: 'var(--ocean)', label: '昼便' },
              { bg: 'var(--status-night-bg)', color: 'var(--status-night-fg)', label: '夜便' },
              { bg: 'var(--status-full-bg)', color: 'var(--status-full-fg)', label: '満員・残2以下' },
            ].map(({ bg, color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: bg, border: '1px solid var(--border)' }} />
                <span style={{ fontSize: '14px', color: 'var(--fg-2)' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-pending-dot)' }} />
              <span style={{ fontSize: '14px', color: 'var(--fg-2)' }}>承認待ち</span>
            </div>
          </div>
        </div>

        {/* 選択日の詳細パネル */}
        {selectedDate && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--ocean)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--surface)' }}>
                {(() => {
                  const d = new Date(selectedDate + 'T00:00:00')
                  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）の予約`
                })()}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '18px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
              >✕</button>
            </div>

            {selectedBookings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--fg-3)', fontSize: '14px' }}>
                予約はありません
              </div>
            ) : (
              selectedBookings.map(b => (
                <div key={b.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--status-closed-bg)' }}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                    <span style={{
                      fontSize: '14px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', flexShrink: 0,
                      background: b.bin_type === 'day' ? 'var(--status-day-bg)' : 'var(--status-night-bg)',
                      color: b.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)',
                    }}>
                      {b.bin_type === 'day' ? '昼便' : '夜便'}
                    </span>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-1)' }}>{b.name}</div>
                      <div style={{ fontSize: '14px', color: 'var(--fg-2)', marginTop: '3px', lineHeight: 1.6 }}>
                        {b.count}名{b.fishing_style ? `　${b.fishing_style}` : ''}
                        {b.message ? `\n${b.message}` : ''}
                      </div>
                    </div>

                    {b.status !== 'pending' && (
                      <span style={{
                        fontSize: '14px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', flexShrink: 0,
                        background: b.status === 'confirmed' ? 'var(--status-ok-bg)' : 'var(--status-closed-bg)',
                        color: b.status === 'confirmed' ? 'var(--status-ok-fg)' : 'var(--fg-2)',
                      }}>
                        {b.status === 'confirmed' ? '承認済み' : 'お断り'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(b.id, 'confirmed')}
                          disabled={actionLoading === b.id}
                          style={{
                            flex: 1, padding: '10px', fontSize: '16px', fontWeight: 700,
                            background: actionLoading === b.id ? 'var(--border)' : 'var(--status-ok-bg)',
                            color: actionLoading === b.id ? 'var(--fg-3)' : 'var(--status-ok-fg)',
                            border: '1px solid var(--status-ok-bd)', borderRadius: '8px',
                            cursor: actionLoading === b.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          }}
                        >{actionLoading === b.id ? '処理中...' : '承認する'}</button>
                        <button
                          onClick={() => updateStatus(b.id, 'rejected')}
                          disabled={actionLoading === b.id}
                          style={{
                            flex: 1, padding: '10px', fontSize: '16px', fontWeight: 700,
                            background: actionLoading === b.id ? 'var(--border)' : 'var(--status-full-bg)',
                            color: actionLoading === b.id ? 'var(--fg-3)' : 'var(--status-full-fg)',
                            border: '1px solid var(--status-full-bd)', borderRadius: '8px',
                            cursor: actionLoading === b.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          }}
                        >お断り</button>
                      </>
                    )}
                    {b.status === 'confirmed' && b.tel && (
                      <a
                        href={`tel:${b.tel}`}
                        style={{
                          flex: 1, padding: '10px', fontSize: '16px', fontWeight: 700, textAlign: 'center',
                          background: 'var(--status-day-bg)', color: 'var(--ocean)', border: '1px solid var(--ocean-light)',
                          borderRadius: '8px', textDecoration: 'none', display: 'block',
                        }}
                      >📞　電話する</a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}



