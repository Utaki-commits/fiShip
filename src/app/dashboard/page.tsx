'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    console.log('useEffect triggered')
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: v } = await supabase
        .from('vessels').select('*').eq('user_id', session.user.id).single()
      if (!v) { router.push('/register'); return }
      setVessel(v)
      // 予約データと便設定を並行取得
      const [{ data: bk }, { data: bs }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', v.id).order('date', { ascending: true }),
        supabase.from('bin_settings').select('*').eq('vessel_id', v.id),
      ])
      setBookings(bk || [])
      console.log('binSettings:', bs)
      setBinSettings(bs || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // /api/bookings PATCH で承認・お断りを実行
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

  // カレンダーセルを描画（月・週共通）
  const renderCalendar = () => {
    // 便設定がその月・曜日に該当するか判定
    const isInPeriod = (bin: BinSetting, month: number, dayOfWeek: number): boolean => {
      return bin.start_month <= month && month <= bin.end_month && bin.days_of_week.includes(dayOfWeek)
    }

    // 指定日・便に対応するbin_settingを返す（なければnull = 休船日）
    const getApplicableBinSetting = (dateStr: string, binType: 'day' | 'night'): BinSetting | null => {
      const d = new Date(dateStr + 'T00:00:00')
      return binSettings.find(s => s.bin_type === binType && isInPeriod(s, d.getMonth(), d.getDay())) ?? null
    }

    // 1セルを描画
    const renderCell = (dateStr: string) => {
      const todayStr = toDateStr(new Date())
      const isToday = dateStr === todayStr
      const isSelected = selectedDate === dateStr
      const cellDate = new Date(dateStr + 'T00:00:00')
      const d = cellDate.getDate()
      const dow = cellDate.getDay()

      const daySetting = getApplicableBinSetting(dateStr, 'day')
      const nightSetting = getApplicableBinSetting(dateStr, 'night')

      // confirmed + pending を合算（rejected は除外）
      const dayBks = bookings.filter(b => b.date === dateStr && b.bin_type === 'day' && b.status !== 'rejected')
      const nightBks = bookings.filter(b => b.date === dateStr && b.bin_type === 'night' && b.status !== 'rejected')
      const dayUsed = dayBks.reduce((s, b) => s + b.count, 0)
      const nightUsed = nightBks.reduce((s, b) => s + b.count, 0)
      const dayRemaining = daySetting ? daySetting.max_capacity - dayUsed : 0
      const nightRemaining = nightSetting ? nightSetting.max_capacity - nightUsed : 0
      const hasPending = [...dayBks, ...nightBks].some(b => b.status === 'pending')

      // 昼便エリアの色・テキスト
      let dayBg = '#F8F9FA'
      let dayLabel: string | null = null
      let dayTextColor = '#9CA3AF'
      if (daySetting) {
        if (dayRemaining <= 0) {
          dayBg = '#FEE2E2'; dayLabel = '満員'; dayTextColor = '#B91C1C'
        } else {
          dayBg = '#E8F4FD'
          dayLabel = `昼　残${dayRemaining}`
          dayTextColor = dayRemaining <= 2 ? '#B91C1C' : '#0A3D62'
        }
      }

      // 夜便エリアの色・テキスト
      let nightBg = '#F8F9FA'
      let nightLabel: string | null = null
      let nightTextColor = '#9CA3AF'
      if (nightSetting) {
        if (nightRemaining <= 0) {
          nightBg = '#FEE2E2'; nightLabel = '満員'; nightTextColor = '#B91C1C'
        } else {
          nightBg = '#EEF2FF'
          nightLabel = `夜　残${nightRemaining}`
          nightTextColor = nightRemaining <= 2 ? '#B91C1C' : '#4338CA'
        }
      }

      return (
        <div
          key={dateStr}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
          style={{
            borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            cursor: 'pointer', minHeight: '58px', transition: 'border-color .15s',
            border: isSelected ? '2px solid #0A3D62' : isToday ? '2px solid #D4AC0D' : '2px solid transparent',
          }}
        >
          {/* 上段：日付 + 承認待ちドット */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '2px 3px 1px', background: '#fff',
          }}>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: dow === 0 ? '#B91C1C' : dow === 6 ? '#2E86C1' : '#374151',
            }}>{d}</span>
            {hasPending && (
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
            )}
          </div>

          {/* 中段：昼便エリア */}
          <div style={{ flex: 1, background: dayBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dayLabel && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: dayTextColor, whiteSpace: 'nowrap' }}>
                {dayLabel}
              </span>
            )}
          </div>

          {/* 下段：夜便エリア */}
          <div style={{ flex: 1, background: nightBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {nightLabel && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: nightTextColor, whiteSpace: 'nowrap' }}>
                {nightLabel}
              </span>
            )}
          </div>
        </div>
      )
    }

    // 月表示：空白セル + 日付セル
    if (view === 'month') {
      const fd = new Date(calYear, calM, 1).getDay()
      const tot = new Date(calYear, calM + 1, 0).getDate()
      const cells = []
      for (let i = 0; i < fd; i++) {
        cells.push(<div key={`e${i}`} style={{ minHeight: '58px' }} />)
      }
      for (let d = 1; d <= tot; d++) {
        const dateStr = `${calYear}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        cells.push(renderCell(dateStr))
      }
      return cells
    }

    // 週表示：weekStart から7日分
    const cells = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      cells.push(renderCell(toDateStr(d)))
    }
    return cells
  }

  // 週表示ヘッダーラベル
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getFullYear()}年${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}〜${weekEnd.getDate()}日`
    : `${MONTH_NAMES[weekStart.getMonth()]}${weekStart.getDate()}日〜${MONTH_NAMES[weekEnd.getMonth()]}${weekEnd.getDate()}日`

  // 選択日の予約（rejected除外・昼→夜の順）
  const selectedBookings = selectedDate
    ? bookings
        .filter(b => b.date === selectedDate && b.status !== 'rejected')
        .sort((a, b) => (a.bin_type === b.bin_type ? 0 : a.bin_type === 'day' ? -1 : 1))
    : []

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
        </div>
        {getPendingCount() > 0 && (
          <div style={{ background: '#D97706', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
            承認待ち {getPendingCount()}件
          </div>
        )}
        <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          ログアウト
        </button>
      </div>

      <div style={{ padding: '12px' }}>

        {/* SNS・電話から取り込むボタン */}
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
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>SNS・電話から取り込む</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>メッセージを貼り付けるだけで自動入力</div>
            </div>
          </div>
          <span style={{ fontSize: '16px', color: '#9CA3AF' }}>→</span>
        </button>

        {/* カレンダー */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>

          {/* ヘッダー：ナビ・タイトル・月/週トグル */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={view === 'month'
                ? () => { if (calM === 0) { setCalM(11); setCalYear(y => y - 1) } else setCalM(m => m - 1) }
                : () => setWeekStart(d => { const p = new Date(d); p.setDate(d.getDate() - 7); return p })
              }
              style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}
            >◀</button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                {view === 'month' ? `${calYear}年${MONTH_NAMES[calM]}` : weekLabel}
              </span>
              {/* 月 / 週 切り替えトグル */}
              <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                {(['month', 'week'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      padding: '4px 16px', fontSize: '12px', fontWeight: 700,
                      background: view === v ? '#fff' : 'transparent',
                      color: view === v ? '#0A3D62' : '#9CA3AF',
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
              style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%', background: '#F8F9FA', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '14px' }}
            >▶</button>
          </div>

          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', color: i === 0 ? '#B91C1C' : i === 6 ? '#2E86C1' : '#9CA3AF' }}>{d}</div>
            ))}
          </div>

          {/* セルグリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {renderCalendar()}
          </div>

          {/* 凡例 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[
              { bg: '#E8F4FD', color: '#0A3D62', label: '昼便' },
              { bg: '#EEF2FF', color: '#4338CA', label: '夜便' },
              { bg: '#FEE2E2', color: '#B91C1C', label: '満員・残2以下' },
            ].map(({ bg, color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: bg, border: `1px solid ${color}22` }} />
                <span style={{ fontSize: '10px', color: '#6B7280' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706' }} />
              <span style={{ fontSize: '10px', color: '#6B7280' }}>承認待ち</span>
            </div>
          </div>
        </div>

        {/* 選択日の詳細パネル */}
        {selectedDate && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
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
              <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                予約はありません
              </div>
            ) : (
              selectedBookings.map(b => (
                <div key={b.id} style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>

                  {/* 予約情報 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                    {/* 昼/夜バッジ */}
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', flexShrink: 0,
                      background: b.bin_type === 'day' ? '#E8F4FD' : '#EEF2FF',
                      color: b.bin_type === 'day' ? '#0A3D62' : '#4338CA',
                    }}>
                      {b.bin_type === 'day' ? '昼便' : '夜便'}
                    </span>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{b.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px', lineHeight: 1.6 }}>
                        {b.count}名{b.fishing_style ? `　${b.fishing_style}` : ''}
                        {b.message ? `\n${b.message}` : ''}
                      </div>
                    </div>

                    {/* ステータスバッジ（確定・お断りのみ） */}
                    {b.status !== 'pending' && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', flexShrink: 0,
                        background: b.status === 'confirmed' ? '#D4EDDA' : '#F3F4F6',
                        color: b.status === 'confirmed' ? '#1B6B3A' : '#6B7280',
                      }}>
                        {b.status === 'confirmed' ? '承認済み' : 'お断り'}
                      </span>
                    )}
                  </div>

                  {/* アクションボタン */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(b.id, 'confirmed')}
                          disabled={actionLoading === b.id}
                          style={{
                            flex: 1, padding: '10px', fontSize: '14px', fontWeight: 700,
                            background: actionLoading === b.id ? '#E5E7EB' : '#D4EDDA',
                            color: actionLoading === b.id ? '#9CA3AF' : '#1B6B3A',
                            border: '1px solid #86EFAC', borderRadius: '8px',
                            cursor: actionLoading === b.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          }}
                        >{actionLoading === b.id ? '処理中...' : '承認する'}</button>
                        <button
                          onClick={() => updateStatus(b.id, 'rejected')}
                          disabled={actionLoading === b.id}
                          style={{
                            flex: 1, padding: '10px', fontSize: '14px', fontWeight: 700,
                            background: actionLoading === b.id ? '#E5E7EB' : '#FEE2E2',
                            color: actionLoading === b.id ? '#9CA3AF' : '#B91C1C',
                            border: '1px solid #FCA5A5', borderRadius: '8px',
                            cursor: actionLoading === b.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          }}
                        >お断り</button>
                      </>
                    )}
                    {b.status === 'confirmed' && b.tel && (
                      <a
                        href={`tel:${b.tel}`}
                        style={{
                          flex: 1, padding: '10px', fontSize: '14px', fontWeight: 700, textAlign: 'center',
                          background: '#E8F4FD', color: '#0A3D62', border: '1px solid #BFDBFE',
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
