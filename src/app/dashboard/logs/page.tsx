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
      const res = await fetch('/api/auth/profile')
      if (!res.ok) { router.push('/login'); return }

      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', user.sub).single()
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
    <main className="flex min-h-screen items-center justify-center bg-[#F7F2EF]">
      <div className="text-[15px] font-normal text-[#57534E]">読み込み中...</div>
    </main>
  )

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F7F2EF] text-[#1C1917]">

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-title { display: block !important; }
          body { background: #FFFFFF !important; margin: 0; padding: 16px; }
          * { font-family: sans-serif; }
        }
        .print-title { display: none; }
      `}</style>

      <header className="no-print sticky top-0 z-20 flex min-h-[80px] items-center gap-4 bg-[#7F1D1D] px-5 py-[18px]">
        <button
          onClick={() => selectedDay ? setSelectedDay(null) : router.push('/dashboard')}
          className="h-14 w-14 shrink-0 rounded-[9px] border-[0.5px] border-white/30 bg-transparent text-[20px] font-normal text-white"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[22px] font-medium leading-tight text-white">
            {selectedDay ? `${formatDateShort(selectedDay.date)} の乗船名簿` : '乗船名簿'}
          </div>
          <div className="mt-1 text-[14px] font-normal leading-relaxed text-white/80">
            {selectedDay
              ? `乗船人数 ${selectedDay.bookings.reduce((s, b) => s + b.count, 0)}名`
              : '出船日ごとの乗船者記録'}
          </div>
        </div>
        {selectedDay && forms.every(f => f.saved) && forms.length > 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-[13px] font-medium text-[#7F1D1D]">記録完了</span>
        )}
      </header>

      {!selectedDay && (
        <main className="p-4">
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-1">
            {([
              { key: 'upcoming' as const, label: '今後の出船' },
              { key: 'past' as const, label: `過去の出船 ${past.length}件` },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-0 rounded-[9px] px-3 py-[14px] text-[14px] font-medium ${
                  tab === t.key ? 'bg-[#B91C1C] text-white' : 'bg-transparent text-[#57534E]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {days.length === 0 ? (
            <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-5 py-10 text-center">
              <div className="mb-2 text-[17px] font-medium text-[#1C1917]">まだ出船記録がありません</div>
              <div className="text-[14px] font-normal leading-relaxed text-[#57534E]">
                予約が承認されるとここに出船日が表示されます
              </div>
            </section>
          ) : displayDays.length === 0 ? (
            <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-5 py-10 text-center text-[14px] font-normal text-[#57534E]">
              {tab === 'upcoming' ? '今後の出船予定はありません' : '過去の出船記録はありません'}
            </section>
          ) : (
            <div className="space-y-2">
              {displayDays.map(day => {
                const totalCount = day.bookings.reduce((s, b) => s + b.count, 0)
                const isToday = day.date === today
                const d = new Date(day.date + 'T00:00:00')

                return (
                  <button
                    key={day.date}
                    onClick={() => openDay(day)}
                    className="flex w-full items-center gap-3 rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-left"
                  >
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[9px] border-[0.5px] ${
                      isToday ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#B91C1C]' : 'border-[#E8DDD8] bg-[#F7F2EF] text-[#57534E]'
                    }`}>
                      <div className="text-[12px] font-medium">{d.getMonth() + 1}月</div>
                      <div className="text-[18px] font-medium leading-none">{d.getDate()}</div>
                      <div className="text-[12px] font-medium">{DAY_NAMES[d.getDay()]}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {isToday && <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[12px] font-medium text-[#B91C1C]">今日</span>}
                        <span className="text-[15px] font-medium text-[#1C1917]">乗船 {totalCount}名</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {day.bookings.map(b => (
                          <span key={b.id} className="rounded-full bg-[#F7F2EF] px-2 py-1 text-[13px] font-normal text-[#57534E]">
                            {b.name} {b.count}名
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${
                      day.isCompleted ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F7F2EF] text-[#57534E]'
                    }`}>
                      {day.isCompleted ? '記録済' : '未記録'}
                    </div>
                  </button>
                )
              })}

              {tab === 'past' && pastTotalPages > 1 && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setPastPage(p => Math.max(0, p - 1))}
                    disabled={pastPage === 0}
                    className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-5 py-[14px] text-[14px] font-medium text-[#57534E] disabled:text-[#A8A29E]"
                  >
                    前へ
                  </button>
                  <span className="text-[14px] font-normal text-[#57534E]">{pastPage + 1} / {pastTotalPages}</span>
                  <button
                    onClick={() => setPastPage(p => Math.min(pastTotalPages - 1, p + 1))}
                    disabled={pastPage >= pastTotalPages - 1}
                    className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-5 py-[14px] text-[14px] font-medium text-[#57534E] disabled:text-[#A8A29E]"
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {selectedDay && (
        <main className="p-4">
          <div className="print-title mb-4 border-b-[0.5px] border-[#1C1917] pb-2">
            <div className="text-[18px] font-medium">乗船名簿</div>
            <div className="mt-1 text-[14px] font-normal">{formatDate(selectedDay.date)}</div>
          </div>

          <section className="mb-3 rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-4">
            <div className="text-[17px] font-medium text-[#1C1917]">{formatDate(selectedDay.date)}</div>
            <div className="mt-1 text-[14px] font-normal text-[#57534E]">
              合計 {selectedDay.bookings.reduce((s, b) => s + b.count, 0)}名が乗船予定
            </div>
          </section>

          {selectedDay.bookings.length > 0 && (() => {
            const binType = selectedDay.bookings[0].bin_type
            const bin = binSettings.find(b => b.bin_type === binType)
            const total = selectedDay.bookings.reduce((s, b) => s + b.count, 0)
            if (bin && total > bin.max_capacity) {
              return (
                <div className="mb-3 rounded-[12px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[14px] font-medium text-[#B91C1C]">
                  定員（{bin.max_capacity}名）を超えて登録されています（合計{total}名）
                </div>
              )
            }
            return null
          })()}

          <div className="space-y-3">
            {forms.map((form) => (
              <section
                key={form.formKey}
                className="overflow-hidden rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white"
              >
                <div className="flex items-start justify-between gap-3 border-b-[0.5px] border-[#E8DDD8] bg-[#F7F2EF] px-4 py-[14px]">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${
                        form.bin_type === 'day' ? 'bg-[#DBEAFE] text-[#1E3A8A]' : 'bg-[#EDE9FE] text-[#5B21B6]'
                      }`}>
                        {form.bin_type === 'day' ? '昼便' : '夜便'}
                      </span>
                      {form.isCompanion && (
                        <span className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#57534E]">同伴者</span>
                      )}
                    </div>
                    <div className="text-[15px] font-medium leading-relaxed text-[#1C1917]">
                      {form.isCompanion ? `代表：${form.representativeName}様のご同行` : form.name}
                    </div>
                  </div>
                  {form.saved && <span className="shrink-0 rounded-full bg-[#ECFDF5] px-3 py-1 text-[12px] font-medium text-[#059669]">保存済</span>}
                </div>

                <div className="p-4">
                  {!form.isCompanion && form.tel && (
                    <div className="mb-3 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-[#F7F2EF] p-3">
                      <div className="text-[12px] font-normal text-[#57534E]">電話番号</div>
                      <a href={`tel:${form.tel}`} className="text-[15px] font-medium text-[#B91C1C]">{form.tel}</a>
                    </div>
                  )}

                  <label className="mb-2 block text-[14px] font-medium text-[#57534E]">
                    住所 <span className="font-normal text-[#A8A29E]">乗船名簿に必要な情報です</span>
                  </label>
                  <input
                    value={form.address}
                    onChange={e => updateForm(form.formKey, 'address', e.target.value)}
                    placeholder="例：福岡県福岡市博多区〇〇1-2-3"
                    className="mb-3 w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white p-4 text-[16px] font-normal text-[#1C1917] outline-none"
                  />

                  <label className="mb-2 block text-[14px] font-medium text-[#57534E]">
                    緊急連絡先 <span className="font-normal text-[#A8A29E]">任意</span>
                  </label>
                  <input
                    value={form.emergency_contact}
                    onChange={e => updateForm(form.formKey, 'emergency_contact', e.target.value)}
                    placeholder="例：妻・090-0000-0000"
                    type="tel"
                    className="mb-4 w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white p-4 text-[16px] font-normal text-[#1C1917] outline-none"
                  />

                  <button
                    onClick={() => savePassenger(form)}
                    disabled={form.saving || !form.address.trim()}
                    className="min-h-0 w-full rounded-[9px] bg-[#B91C1C] px-4 py-[14px] text-[15px] font-medium text-white disabled:bg-[#E8DDD8] disabled:text-[#A8A29E]"
                  >
                    {form.saving ? '保存中...' : form.saved ? '保存済み' : `${form.isCompanion ? '同伴者の' : `${form.name}の`}情報を保存する`}
                  </button>
                </div>
              </section>
            ))}
          </div>

          {forms.length > 0 && forms.every(f => f.saved) && (
            <div className="mt-3 rounded-[12px] border-[0.5px] border-[#A7F3D0] bg-[#ECFDF5] p-4 text-center">
              <div className="text-[17px] font-medium text-[#059669]">この日の乗船名簿は記録完了です</div>
              <div className="mt-1 text-[14px] font-normal text-[#059669]">全員分の情報が保存されました</div>
            </div>
          )}

          <button
            className="no-print mt-3 min-h-0 w-full rounded-[9px] bg-[#B91C1C] px-4 py-[14px] text-[15px] font-medium text-white"
            onClick={() => window.print()}
          >
            この日の乗船名簿を保存する
          </button>

          <button
            className="no-print mt-2 min-h-0 w-full rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 py-[14px] text-[15px] font-medium text-[#57534E]"
            onClick={() => setSelectedDay(null)}
          >
            一覧に戻る
          </button>
        </main>
      )}
    </div>
  )
}



