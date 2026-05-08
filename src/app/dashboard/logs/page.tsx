'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  date: string
  bin_type: string
  name: string
  tel: string
  count: number
  fishing_style: string | null
  status: string
}

type PassengerLog = {
  id: string
  booking_id: string | null
  date: string
  bin_type: string
  name: string
  tel: string
  count: number
  address: string
  emergency_contact: string
}

type BinSetting = {
  id: string
  bin_type: string
  max_capacity: number
}

// 日付ごとの乗船情報
type DayManifest = {
  date: string
  bookings: Booking[]
  logs: PassengerLog[]
  isCompleted: boolean
}

// 1乗客分の編集フォーム（同伴者含む）
type PassengerForm = {
  formKey: string          // 一意キー（booking_id または booking_id_companion_N）
  booking_id: string | null  // 同伴者は null
  name: string
  tel: string
  count: number
  bin_type: string
  address: string
  emergency_contact: string
  saved: boolean
  saving: boolean
  isCompanion: boolean
  representativeName: string
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
}

const formatDateShort = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
}

// 今日の日付文字列を返す
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LogsPage() {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [days, setDays] = useState<DayManifest[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayManifest | null>(null)
  const [forms, setForms] = useState<PassengerForm[]>([])
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [pastPage, setPastPage] = useState(0)
  const PAST_PAGE_SIZE = 20
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)

      // 確認済み予約・乗船名簿・便設定を並行取得
      const [{ data: bookings }, { data: logs }, { data: bs }] = await Promise.all([
        supabase.from('bookings').select('id, date, bin_type, name, tel, count, fishing_style, status')
          .eq('vessel_id', vessel.id).eq('status', 'confirmed').order('date', { ascending: false }),
        supabase.from('passenger_logs').select('*').eq('vessel_id', vessel.id),
        supabase.from('bin_settings').select('id, bin_type, max_capacity').eq('vessel_id', vessel.id),
      ])
      setBinSettings(bs || [])

      // 日付ごとにグループ化
      const map = new Map<string, DayManifest>()
      for (const b of bookings || []) {
        if (!map.has(b.date)) {
          map.set(b.date, { date: b.date, bookings: [], logs: [], isCompleted: false })
        }
        map.get(b.date)!.bookings.push(b)
      }

      // 乗船名簿データを紐付け
      for (const log of logs || []) {
        if (map.has(log.date)) {
          map.get(log.date)!.logs.push(log)
        }
      }

      // 全乗客に住所が入っていれば完了フラグを立てる
      const result = Array.from(map.values()).map(day => {
        const hasAllAddresses = day.bookings.every(b => {
          const log = day.logs.find(l => l.booking_id === b.id)
          return log && log.address.trim() !== ''
        })
        return { ...day, isCompleted: hasAllAddresses && day.bookings.length > 0 }
      })

      result.sort((a, b) => b.date.localeCompare(a.date))
      setDays(result)
      setLoading(false)
    }
    init()
  }, [router])

  // 日付を選択して名簿フォームを開く（複数名予約は代表者＋同伴者に展開）
  const openDay = (day: DayManifest) => {
    setSelectedDay(day)
    const initialized: PassengerForm[] = []

    for (const b of day.bookings) {
      const log = day.logs.find(l => l.booking_id === b.id)

      // 代表者フォーム
      initialized.push({
        formKey: b.id,
        booking_id: b.id,
        name: b.name,
        tel: b.tel,
        count: 1,
        bin_type: b.bin_type,
        address: log?.address || '',
        emergency_contact: log?.emergency_contact || '',
        saved: !!log?.address,
        saving: false,
        isCompanion: false,
        representativeName: b.name,
      })

      // 同伴者フォーム（count > 1 の場合に追加）
      for (let i = 1; i < b.count; i++) {
        initialized.push({
          formKey: `${b.id}_companion_${i}`,
          booking_id: null,
          name: `（代表：${b.name}様のご同行）`,
          tel: '',
          count: 1,
          bin_type: b.bin_type,
          address: '',
          emergency_contact: '',
          saved: false,
          saving: false,
          isCompanion: true,
          representativeName: b.name,
        })
      }
    }

    setForms(initialized)
  }

  // フォームフィールドを更新する
  const updateForm = (formKey: string, field: keyof PassengerForm, value: string) => {
    setForms(prev => prev.map(f => f.formKey === formKey ? { ...f, [field]: value, saved: false } : f))
  }

  // 1乗客の名簿を保存する
  const savePassenger = async (form: PassengerForm) => {
    if (!vesselId || !selectedDay) return
    setForms(prev => prev.map(f => f.formKey === form.formKey ? { ...f, saving: true } : f))

    try {
      const res = await fetch('/api/passenger-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          booking_id: form.booking_id,
          date: selectedDay.date,
          bin_type: form.bin_type,
          name: form.name,
          tel: form.tel,
          count: form.count,
          address: form.address,
          emergency_contact: form.emergency_contact,
        }),
      })

      if (res.ok) {
        setForms(prev => prev.map(f => f.formKey === form.formKey ? { ...f, saved: true, saving: false } : f))
        // デイリストの完了フラグを更新
        const allSaved = forms.every(f => f.formKey === form.formKey ? true : f.saved)
        setDays(prev => prev.map(d =>
          d.date === selectedDay.date ? { ...d, isCompleted: allSaved } : d
        ))
      }
    } finally {
      setForms(prev => prev.map(f => f.formKey === form.formKey ? { ...f, saving: false } : f))
    }
  }

  const today = todayStr()
  const upcoming = days.filter(d => d.date >= today)
  const past = days.filter(d => d.date < today)
  // 今後は直近1件のみ・過去は20件ページング
  const upcomingDisplay = upcoming.slice(0, 1)
  const pastTotalPages = Math.ceil(past.length / PAST_PAGE_SIZE)
  const pastDisplay = past.slice(pastPage * PAST_PAGE_SIZE, (pastPage + 1) * PAST_PAGE_SIZE)
  const displayDays = tab === 'upcoming' ? upcomingDisplay : pastDisplay

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'sans-serif' }}>

      {/* 印刷用スタイル */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-title { display: block !important; }
          body { background: var(--surface) !important; margin: 0; padding: 16px; }
          * { font-family: sans-serif; }
        }
        .print-title { display: none; }
      `}</style>

      {/* ヘッダー */}
      <div className="no-print" style={{ background: 'var(--ocean)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <button
          onClick={() => selectedDay ? setSelectedDay(null) : router.push('/dashboard')}
          style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'var(--surface)', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--surface)' }}>
            {selectedDay ? formatDateShort(selectedDay.date) + ' の乗船名簿' : '乗船名簿'}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            {selectedDay
              ? `乗船人数 ${selectedDay.bookings.reduce((s, b) => s + b.count, 0)}名`
              : '出船日ごとの乗船者記録'}
          </div>
        </div>
        {selectedDay && forms.every(f => f.saved) && forms.length > 0 && (
          <span style={{ background: 'var(--status-ok-bg)', color: 'var(--status-ok-fg)', fontSize: '14px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px' }}>記録完了</span>
        )}
      </div>

      {/* ===== 日付一覧ビュー ===== */}
      {!selectedDay && (
        <div style={{ padding: '12px' }}>

          {/* 今後/過去 タブ */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--border)', borderRadius: '10px', padding: '3px', marginBottom: '12px' }}>
            {([
              { key: 'upcoming' as const, label: `今後の出船（直近1件）` },
              { key: 'past' as const, label: `過去の出船（${past.length}件）` },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '10px', fontSize: '14px', fontWeight: 700,
                  background: tab === t.key ? 'var(--surface)' : 'transparent',
                  color: tab === t.key ? 'var(--ocean)' : 'var(--fg-3)',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                }}
              >{t.label}</button>
            ))}
          </div>

          {days.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '6px' }}>まだ出船記録がありません</div>
              <div style={{ fontSize: '14px', color: 'var(--fg-3)', lineHeight: 1.6 }}>
                予約が承認されると<br />ここに出船日が表示されます
              </div>
            </div>
          ) : displayDays.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: 'var(--fg-3)' }}>
                {tab === 'upcoming' ? '今後の出船予定はありません' : '過去の出船記録はありません'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayDays.map(day => {
                const totalCount = day.bookings.reduce((s, b) => s + b.count, 0)
                const isToday = day.date === today

                return (
                  <button
                    key={day.date}
                    onClick={() => openDay(day)}
                    style={{
                      background: 'var(--surface)', border: isToday ? '2px solid var(--gold)' : '1px solid var(--border)',
                      borderRadius: '12px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                    }}
                  >
                    {/* 日付アイコン */}
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                      background: isToday ? 'var(--gold)' : day.isCompleted ? 'var(--status-ok-bg)' : 'var(--bg)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: isToday ? 'none' : '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: isToday ? 'var(--surface)' : 'var(--fg-3)' }}>
                        {new Date(day.date + 'T00:00:00').getMonth() + 1}月
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: isToday ? 'var(--surface)' : 'var(--fg-1)', lineHeight: 1 }}>
                        {new Date(day.date + 'T00:00:00').getDate()}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: isToday ? 'var(--surface)' : 'var(--fg-3)' }}>
                        {DAY_NAMES[new Date(day.date + 'T00:00:00').getDay()]}
                      </div>
                    </div>

                    {/* 情報 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {isToday && (
                          <span style={{ fontSize: '14px', fontWeight: 700, background: 'var(--gold)', color: 'var(--ocean)', padding: '2px 6px', borderRadius: '4px' }}>今日</span>
                        )}
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-1)' }}>
                          乗船 {totalCount}名
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {day.bookings.map(b => (
                          <span key={b.id} style={{
                            fontSize: '14px', color: 'var(--fg-2)',
                            background: 'var(--status-closed-bg)', padding: '2px 8px', borderRadius: '99px',
                          }}>
                            {b.name} {b.count}名
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 完了ステータス */}
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      {day.isCompleted ? (
                        <>
                          <div style={{ fontSize: '18px' }}>✅</div>
                          <div style={{ fontSize: '14px', color: 'var(--status-ok-fg)', fontWeight: 700 }}>記録済</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '18px' }}>📋</div>
                          <div style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 700 }}>未記録</div>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}

              {/* 過去タブのページング */}
              {tab === 'past' && pastTotalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', marginTop: '4px' }}>
                  <button
                    onClick={() => setPastPage(p => Math.max(0, p - 1))}
                    disabled={pastPage === 0}
                    style={{
                      padding: '10px 20px', fontSize: '14px', fontWeight: 700,
                      background: pastPage === 0 ? 'var(--status-closed-bg)' : 'var(--surface)',
                      color: pastPage === 0 ? 'var(--fg-3)' : 'var(--ocean)',
                      border: '2px solid var(--border)', borderRadius: '8px',
                      cursor: pastPage === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}
                  >← 前へ</button>
                  <span style={{ fontSize: '14px', color: 'var(--fg-2)', fontWeight: 700 }}>
                    {pastPage + 1} / {pastTotalPages}ページ
                  </span>
                  <button
                    onClick={() => setPastPage(p => Math.min(pastTotalPages - 1, p + 1))}
                    disabled={pastPage >= pastTotalPages - 1}
                    style={{
                      padding: '10px 20px', fontSize: '14px', fontWeight: 700,
                      background: pastPage >= pastTotalPages - 1 ? 'var(--status-closed-bg)' : 'var(--surface)',
                      color: pastPage >= pastTotalPages - 1 ? 'var(--fg-3)' : 'var(--ocean)',
                      border: '2px solid var(--border)', borderRadius: '8px',
                      cursor: pastPage >= pastTotalPages - 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}
                  >次へ →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 名簿記入ビュー ===== */}
      {selectedDay && (
        <div style={{ padding: '12px' }}>

          {/* 印刷用タイトル */}
          <div className="print-title" style={{ marginBottom: '16px', borderBottom: '2px solid var(--fg-1)', paddingBottom: '8px' }}>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>乗船名簿</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>{formatDate(selectedDay.date)}</div>
          </div>

          {/* 日付ヘッダー */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>📋</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-1)' }}>{formatDate(selectedDay.date)}</div>
              <div style={{ fontSize: '14px', color: 'var(--fg-2)', marginTop: '2px' }}>
                合計 {selectedDay.bookings.reduce((s, b) => s + b.count, 0)}名が乗船予定
              </div>
            </div>
          </div>

          {/* 定員超過の警告 */}
          {selectedDay.bookings.length > 0 && (() => {
            const binType = selectedDay.bookings[0].bin_type
            const bin = binSettings.find(b => b.bin_type === binType)
            const total = selectedDay.bookings.reduce((s, b) => s + b.count, 0)
            if (bin && total > bin.max_capacity) {
              return (
                <div style={{ background: 'var(--status-pending-bg)', border: '1px solid var(--status-pending-dot)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '14px', color: 'var(--status-pending-fg)', fontWeight: 700 }}>
                  ⚠ 定員（{bin.max_capacity}名）を超えて登録されています（合計{total}名）
                </div>
              )
            }
            return null
          })()}

          {/* 乗客ごとのフォーム */}
          {forms.map((form) => {
            return (
              <div
                key={form.formKey}
                style={{
                  background: 'var(--surface)',
                  border: form.saved ? '2px solid var(--status-ok-bd)' : form.isCompanion ? '1px dashed var(--fg-3)' : '1px solid var(--border)',
                  borderRadius: '12px', overflow: 'hidden', marginBottom: '12px',
                }}
              >
                {/* 乗客ヘッダー */}
                <div style={{
                  background: form.saved ? 'var(--status-ok-bg)' : form.isCompanion ? 'var(--bg)' : (form.bin_type === 'day' ? 'var(--status-day-bg)' : 'var(--status-night-bg)'),
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '14px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
                      background: form.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)', color: 'var(--surface)',
                    }}>
                      {form.bin_type === 'day' ? '昼便' : '夜便'}
                    </span>
                    {form.isCompanion && (
                      <span style={{ fontSize: '14px', fontWeight: 700, background: 'var(--border)', color: 'var(--fg-2)', padding: '2px 8px', borderRadius: '99px' }}>
                        同伴者
                      </span>
                    )}
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-1)' }}>
                      {form.isCompanion ? `（代表：${form.representativeName}様のご同行）` : form.name}
                    </span>
                  </div>
                  {form.saved && <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-ok-fg)' }}>保存済 ✓</span>}
                </div>

                <div style={{ padding: '14px' }}>
                  {/* 電話番号（代表者のみ表示） */}
                  {!form.isCompanion && form.tel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--fg-2)', fontWeight: 700, flexShrink: 0 }}>電話番号</span>
                      <a href={`tel:${form.tel}`} style={{ fontSize: '14px', color: 'var(--ocean)', fontWeight: 700, textDecoration: 'none' }}>{form.tel}</a>
                    </div>
                  )}

                  {/* 住所 */}
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
                    住所
                    <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400, marginLeft: '6px' }}>乗船名簿に必要な情報です</span>
                  </label>
                  <input
                    value={form.address}
                    onChange={e => updateForm(form.formKey, 'address', e.target.value)}
                    placeholder="例：福岡県福岡市博多区〇〇1-2-3"
                    style={{
                      width: '100%', padding: '12px', fontSize: '15px',
                      border: '2px solid var(--border)', borderRadius: '8px',
                      fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box',
                    }}
                  />

                  {/* 緊急連絡先 */}
                  <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
                    緊急連絡先
                    <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400, marginLeft: '6px' }}>（任意）</span>
                  </label>
                  <input
                    value={form.emergency_contact}
                    onChange={e => updateForm(form.formKey, 'emergency_contact', e.target.value)}
                    placeholder="例：妻・090-0000-0000"
                    type="tel"
                    style={{
                      width: '100%', padding: '12px', fontSize: '15px',
                      border: '2px solid var(--border)', borderRadius: '8px',
                      fontFamily: 'inherit', marginBottom: '14px', boxSizing: 'border-box',
                    }}
                  />

                  {/* 保存ボタン */}
                  <button
                    onClick={() => savePassenger(form)}
                    disabled={form.saving || !form.address.trim()}
                    style={{
                      width: '100%', padding: '13px', fontSize: '14px', fontWeight: 700,
                      background: form.saving || !form.address.trim() ? 'var(--border)'
                        : form.saved ? 'var(--status-ok-bg)' : 'var(--ocean)',
                      color: form.saving || !form.address.trim() ? 'var(--fg-3)'
                        : form.saved ? 'var(--status-ok-fg)' : 'var(--surface)',
                      border: form.saved ? '2px solid var(--status-ok-bd)' : 'none',
                      borderRadius: '8px', cursor: form.saving || !form.address.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {form.saving ? '保存中...' : form.saved ? '保存済み ✓' : `${form.isCompanion ? '同伴者の' : `${form.name}の`}情報を保存する`}
                  </button>
                </div>
              </div>
            )
          })}

          {/* 全員分保存済みのメッセージ */}
          {forms.length > 0 && forms.every(f => f.saved) && (
            <div style={{ background: 'var(--status-ok-bg)', border: '2px solid var(--status-ok-bd)', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>✅</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-ok-fg)' }}>この日の乗船名簿は記録完了です</div>
              <div style={{ fontSize: '14px', color: 'var(--status-ok-fg)', marginTop: '4px' }}>全員分の情報が保存されました</div>
            </div>
          )}

          {/* 印刷ボタン */}
          <button
            className="no-print"
            onClick={() => window.print()}
            style={{
              width: '100%', padding: '14px', fontSize: '14px', fontWeight: 700,
              background: 'var(--ocean)', color: 'var(--surface)', border: 'none',
              borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '8px',
            }}
          >
            この日の乗船名簿を保存する（印刷・提出用）
          </button>

          <button
            className="no-print"
            onClick={() => setSelectedDay(null)}
            style={{
              width: '100%', padding: '14px', fontSize: '14px', fontWeight: 700,
              background: 'var(--surface)', color: 'var(--fg-2)', border: '2px solid var(--border)',
              borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← 一覧に戻る
          </button>
        </div>
      )}
    </div>
  )
}



