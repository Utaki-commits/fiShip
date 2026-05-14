'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type BinSetting = {
  id: string
  vessel_id: string
  name: string
  bin_type: 'day' | 'night' | 'relay'
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  end_time: string
  fish_types: string[]
  max_capacity: number
  price: string
  enabled: boolean
}

type BlockedDate = {
  id: string
  vessel_id: string
  date_from: string
  date_to: string
  bin_type: string | null
  type: 'maintenance' | 'weather' | 'trouble' | 'other'
  reason: string
  created_at: string
}

type FormState = {
  name: string
  bin_type: 'day' | 'night' | 'relay'
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  end_time: string
  fish_input: string
  fish_types: string[]
  max_capacity: string
  price: string
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES = ['日','月','火','水','木','金','土']

const BLOCK_TYPES = [
  { key: 'maintenance', label: '🔧 メンテナンス' },
  { key: 'weather', label: '⛅ 天候・波による中止' },
  { key: 'trouble', label: '🚢 船のトラブル' },
  { key: 'other', label: '📅 その他' },
] as const

const defaultForm = (): FormState => ({
  name: '',
  bin_type: 'day',
  start_month: 0,
  end_month: 11,
  days_of_week: [0,1,2,3,4,5,6],
  departure_time: '06:00',
  end_time: '',
  fish_input: '',
  fish_types: [],
  max_capacity: '',
  price: '',
})

export default function SchedulePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'plan' | 'schedule'>('plan')
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [settings, setSettings] = useState<BinSetting[]>([])
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [blockDateFrom, setBlockDateFrom] = useState('')
  const [blockDateTo, setBlockDateTo] = useState('')
  const [blockBinType, setBlockBinType] = useState<string>('')
  const [blockType, setBlockType] = useState<'maintenance'|'weather'|'trouble'|'other'>('maintenance')
  const [blockReason, setBlockReason] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockDeleting, setBlockDeleting] = useState<string | null>(null)
  const [blockError, setBlockError] = useState('')

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels')
        .select('id')
        .eq('user_id', user.sub)
        .single()
      if (!vessel) { router.push('/register'); return }

      setVesselId(vessel.id)
      const [{ data: bs }, { data: bd }] = await Promise.all([
        supabase.from('bin_settings').select('*').eq('vessel_id', vessel.id),
        supabase.from('blocked_dates').select('*').eq('vessel_id', vessel.id).order('date_from', { ascending: true }),
      ])
      setSettings(((bs || []) as BinSetting[]).map(s => ({ ...s, enabled: s.enabled ?? true })))
      setBlockedDates((bd || []) as BlockedDate[])
      setLoading(false)
    }
    init()
  }, [router])

  const handleAddClick = () => {
    setEditingId(null)
    setForm(defaultForm())
    setError('')
    setView('form')
  }

  const handleEditClick = (s: BinSetting) => {
    setEditingId(s.id)
    setForm({
      name: s.name || '',
      bin_type: s.bin_type,
      start_month: s.start_month,
      end_month: s.end_month,
      days_of_week: [...s.days_of_week],
      departure_time: s.departure_time,
      end_time: s.end_time || '',
      fish_input: '',
      fish_types: [...s.fish_types],
      max_capacity: String(s.max_capacity),
      price: s.price || '',
    })
    setError('')
    setView('form')
  }

  const toggleDay = (dow: number) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(dow)
        ? f.days_of_week.filter(d => d !== dow)
        : [...f.days_of_week, dow],
    }))
  }

  const addFish = () => {
    const val = form.fish_input.trim()
    if (!val || form.fish_types.includes(val)) return
    setForm(f => ({ ...f, fish_types: [...f.fish_types, val], fish_input: '' }))
  }

  const removeFish = (fish: string) => {
    setForm(f => ({ ...f, fish_types: f.fish_types.filter(t => t !== fish) }))
  }

  const handleSave = async () => {
    if (!form.days_of_week.length) { setError('出る曜日を1つ以上選んでください'); return }
    if (!form.departure_time) { setError('出発時刻を入力してください'); return }
    const cap = Number(form.max_capacity)
    if (!form.max_capacity || cap < 1 || cap > 30) { setError('定員は1〜30名の範囲で入力してください'); return }
    if (!vesselId) return

    setSaving(true)
    setError('')
    try {
      const resolvedName = form.name.trim() || (form.bin_type === 'day' ? '昼便' : '夜便')
      const hasSameName = settings.some(s => (s.name || '').trim() === resolvedName && s.id !== editingId)
      if (hasSameName) { setError(`「${resolvedName}」という名前の便はすでに設定されています`); return }

      const payload = {
        vessel_id: vesselId,
        name: resolvedName,
        bin_type: form.bin_type,
        start_month: form.start_month,
        end_month: form.end_month,
        days_of_week: form.days_of_week,
        departure_time: form.departure_time,
        end_time: form.end_time,
        fish_types: form.fish_types,
        max_capacity: cap,
        price: form.price,
      }

      const res = await fetch('/api/bin-settings', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '保存に失敗しました'); return }

      const nextSetting = { ...data.setting, enabled: data.setting.enabled ?? true } as BinSetting
      if (editingId) {
        setSettings(prev => prev.map(s => s.id === editingId ? nextSetting : s))
      } else {
        setSettings(prev => [...prev, nextSetting])
      }
      setView('list')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/bin-settings?id=${id}`, { method: 'DELETE' })
      if (res.ok) setSettings(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const toggleEnabled = async (s: BinSetting) => {
    const next = !(s.enabled ?? true)
    const { data } = await supabase
      .from('bin_settings')
      .update({ enabled: next })
      .eq('id', s.id)
      .select()
      .single()
    if (data) setSettings(prev => prev.map(b => b.id === s.id ? { ...b, enabled: next } : b))
  }

  const handleBlockSave = async () => {
    if (!blockDateFrom) { setBlockError('日付を入力してください'); return }
    if (!vesselId) return

    setBlockSaving(true)
    setBlockError('')
    try {
      const { data, error } = await supabase.from('blocked_dates').insert([{
        vessel_id: vesselId,
        date_from: blockDateFrom,
        date_to: blockDateTo || blockDateFrom,
        bin_type: blockBinType || null,
        type: blockType,
        reason: blockReason,
      }]).select().single()
      if (error) { setBlockError('保存に失敗しました'); return }
      setBlockedDates(prev => [...prev, data as BlockedDate].sort((a, b) => a.date_from.localeCompare(b.date_from)))
      setBlockDateFrom('')
      setBlockDateTo('')
      setBlockBinType('')
      setBlockReason('')
    } finally {
      setBlockSaving(false)
    }
  }

  const handleBlockDelete = async (id: string) => {
    setBlockDeleting(id)
    try {
      await supabase.from('blocked_dates').delete().eq('id', id)
      setBlockedDates(prev => prev.filter(b => b.id !== id))
    } finally {
      setBlockDeleting(null)
    }
  }

  const formatBlockDate = (from: string, to: string) => {
    const f = new Date(from + 'T00:00:00')
    const t = new Date(to + 'T00:00:00')
    const fStr = `${f.getMonth()+1}月${f.getDate()}日`
    const tStr = `${t.getMonth()+1}月${t.getDate()}日`
    return from === to ? fStr : `${fStr}〜${tStr}`
  }

  const sortedSettings = [...settings].sort((a, b) => a.bin_type === b.bin_type ? 0 : a.bin_type === 'day' ? -1 : 1)

  const renderGantt = () => {
    const months = Array.from({ length: 12 }, (_, i) => i)
    return (
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <div style={{ minWidth: '480px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(12, 1fr)', gap: '2px', marginBottom: '4px' }}>
            <div />
            {months.map(m => (
              <div key={m} style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fg-3)', textAlign: 'center' }}>
                {m+1}月
              </div>
            ))}
          </div>
          {sortedSettings.map(s => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '80px repeat(12, 1fr)', gap: '2px', marginBottom: '4px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '4px' }}>
                {s.bin_type === 'day' ? '☀️' : '🌙'} {s.name}
              </div>
              {months.map(m => {
                const inPeriod = s.start_month <= s.end_month
                  ? s.start_month <= m && m <= s.end_month
                  : m >= s.start_month || m <= s.end_month
                return (
                  <div key={m} style={{
                    height: '20px', borderRadius: '4px',
                    background: inPeriod
                      ? ((s.enabled ?? true)
                        ? (s.bin_type === 'day' ? 'var(--status-day-bg)' : 'var(--status-night-bg)')
                        : 'var(--status-closed-bg)')
                      : 'transparent',
                    border: inPeriod ? `1px solid ${s.bin_type === 'day' ? 'var(--ocean-light)' : 'var(--status-night-fg)'}` : 'none',
                    opacity: (s.enabled ?? true) ? 1 : 0.5,
                  }} />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const seasonLabel = (s: BinSetting) => {
    if (s.start_month === 0 && s.end_month === 11) return '通年'
    return `${MONTH_NAMES[s.start_month]}〜${MONTH_NAMES[s.end_month]}`
  }

  const oceanGradient = 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)'
  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }
  const inputStyle = { width: '100%', padding: '16px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '8px', fontFamily: 'inherit', color: 'var(--fg-1)', background: 'var(--surface)', boxSizing: 'border-box' as const }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: oceanGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: '18px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: oceanGradient, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 20, minHeight: '80px' }}>
        <button
          onClick={() => view === 'form' ? setView('list') : router.push('/dashboard')}
          style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            {view === 'form' ? (editingId ? '便を編集する' : '便を追加する') : 'スケジュール管理'}
          </div>
        </div>
      </div>

      {view === 'list' && (
        <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          {([{ key: 'plan', label: '釣行プラン' }, { key: 'schedule', label: '船スケジュール' }] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '16px', fontSize: '18px', fontWeight: 700,
                background: 'transparent', border: 'none',
                borderBottom: tab === key ? '3px solid var(--ocean)' : '3px solid transparent',
                color: tab === key ? 'var(--ocean)' : 'var(--fg-3)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{label}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '16px' }}>
        {tab === 'plan' && view === 'list' && (
          <>
            {settings.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>年間スケジュール</div>
                {renderGantt()}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Legend bg="var(--status-day-bg)" border="var(--ocean-light)" label="昼便" />
                  <Legend bg="var(--status-night-bg)" border="var(--status-night-fg)" label="夜便" />
                  <Legend bg="var(--status-closed-bg)" label="受付中止" />
                </div>
              </div>
            )}

            {settings.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⛵</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '6px' }}>まだ便が設定されていません</div>
                <div style={{ fontSize: '14px', color: 'var(--fg-3)', lineHeight: 1.6 }}>「便を追加する」から<br />昼便・夜便を登録してください</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {sortedSettings.map(s => (
                  <PlanCard
                    key={s.id}
                    setting={s}
                    seasonLabel={seasonLabel(s)}
                    onEdit={() => handleEditClick(s)}
                    onToggle={() => toggleEnabled(s)}
                    onDelete={() => handleDelete(s.id)}
                    deleting={deleting === s.id}
                  />
                ))}
              </div>
            )}

            <button onClick={handleAddClick}
              style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 700, background: 'var(--ocean)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              ＋ 便を追加する
            </button>
          </>
        )}

        {tab === 'schedule' && view === 'list' && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>便の受付状態</div>
              {settings.length === 0 ? (
                <div style={{ fontSize: '16px', color: 'var(--fg-3)' }}>便が設定されていません</div>
              ) : (
                sortedSettings.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)' }}>
                        {s.bin_type === 'day' ? '☀️' : '🌙'} {s.name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--fg-3)', marginTop: '2px', fontWeight: 700 }}>
                        {s.departure_time} 出発{s.end_time ? ` 〜 ${s.end_time} 終了予定` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, padding: '6px 12px', borderRadius: '99px', background: (s.enabled ?? true) ? 'var(--status-ok-bg)' : 'var(--status-closed-bg)', color: (s.enabled ?? true) ? 'var(--status-ok-fg)' : 'var(--fg-3)' }}>
                      {(s.enabled ?? true) ? '受付中' : '受付中止'}
                    </span>
                    <button onClick={() => toggleEnabled(s)}
                      style={{ padding: '10px 16px', fontSize: '15px', fontWeight: 700, background: (s.enabled ?? true) ? 'var(--status-full-bg)' : 'var(--status-ok-bg)', color: (s.enabled ?? true) ? 'var(--status-full-fg)' : 'var(--status-ok-fg)', border: `2px solid ${(s.enabled ?? true) ? 'var(--status-full-bd)' : 'var(--status-ok-bd)'}`, borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {(s.enabled ?? true) ? '中止にする' : '再開する'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '4px' }}>休船日を追加</div>
              <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginBottom: '14px' }}>休船日は最優先で適用されます</div>

              {blockError && (
                <div style={{ background: 'var(--status-full-bg)', border: '2px solid var(--status-full-bd)', borderRadius: '10px', padding: '12px', marginBottom: '12px', fontSize: '15px', fontWeight: 700, color: 'var(--status-full-fg)' }}>
                  {blockError}
                </div>
              )}

              <FieldLabel label="開始日" />
              <input type="date" value={blockDateFrom} onChange={e => setBlockDateFrom(e.target.value)} style={{ ...inputStyle, padding: '12px', marginBottom: '12px' }} />

              <FieldLabel label="終了日（複数日の場合）" />
              <input type="date" value={blockDateTo} onChange={e => setBlockDateTo(e.target.value)} style={{ ...inputStyle, padding: '12px', marginBottom: '12px' }} />

              <FieldLabel label="対象" />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[{ key: '', label: '全便' }, { key: 'day', label: '昼便のみ' }, { key: 'night', label: '夜便のみ' }].map(({ key, label }) => (
                  <button key={key} onClick={() => setBlockBinType(key)}
                    style={{ flex: 1, padding: '12px 6px', fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', background: blockBinType === key ? 'var(--ocean)' : 'var(--surface)', color: blockBinType === key ? '#fff' : 'var(--fg-2)', border: blockBinType === key ? '2px solid var(--ocean)' : '2px solid var(--border)', borderRadius: '10px', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>

              <FieldLabel label="種別" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                {BLOCK_TYPES.map(({ key, label }) => (
                  <button key={key} onClick={() => setBlockType(key)}
                    style={{ width: '100%', padding: '12px 14px', fontSize: '16px', fontWeight: 700, fontFamily: 'inherit', textAlign: 'left', background: blockType === key ? 'var(--ocean-pale)' : 'var(--surface)', color: blockType === key ? 'var(--ocean)' : 'var(--fg-1)', border: blockType === key ? '2px solid var(--ocean)' : '2px solid var(--border)', borderRadius: '10px', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>

              <FieldLabel label="理由メモ（任意）" />
              <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="例：エンジンオーバーホール" style={{ ...inputStyle, padding: '12px', fontSize: '16px', marginBottom: '14px' }} />

              <button onClick={handleBlockSave} disabled={blockSaving}
                style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 700, background: blockSaving ? 'var(--border)' : 'var(--ocean)', color: blockSaving ? 'var(--fg-3)' : '#fff', border: 'none', borderRadius: '12px', cursor: blockSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {blockSaving ? '登録中...' : '登録する'}
              </button>
            </div>

            {blockedDates.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)' }}>設定済み休船日</div>
                </div>
                {blockedDates.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--status-closed-bg)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--fg-1)' }}>
                        {formatBlockDate(b.date_from, b.date_to)}
                        <span style={{ marginLeft: '8px', fontSize: '14px', color: 'var(--fg-3)' }}>
                          {b.bin_type === 'day' ? '昼便のみ' : b.bin_type === 'night' ? '夜便のみ' : '全便'}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--fg-2)', marginTop: '2px' }}>
                        {BLOCK_TYPES.find(t => t.key === b.type)?.label}
                        {b.reason && `　${b.reason}`}
                      </div>
                    </div>
                    <button onClick={() => handleBlockDelete(b.id)} disabled={blockDeleting === b.id}
                      style={{ padding: '8px 14px', fontSize: '14px', fontWeight: 700, background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '8px', cursor: blockDeleting === b.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {blockDeleting === b.id ? '削除中...' : '削除'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '4px' }}>
                便の名前 <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400 }}>（任意）</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginBottom: '8px' }}>
                空欄の場合は「{form.bin_type === 'day' ? '昼便' : '夜便'}」として登録されます
              </div>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：タイラバ便、イカメタル便" style={inputStyle} />
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>便の種類</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([
                  { key: 'day', label: '☀️ 昼便', desc: '朝〜夕方' },
                  { key: 'night', label: '🌙 夜便', desc: '夕方〜深夜' },
                  { key: 'relay', label: '🌅 昼夜便', desc: '昼と夜を連続で行う釣行' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setForm(f => ({ ...f, bin_type: opt.key, departure_time: opt.key === 'day' ? '06:00' : opt.key === 'relay' ? '12:00' : '17:00' }))}
                    style={{ flex: 1, padding: '14px 8px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', background: form.bin_type === opt.key ? (opt.key === 'day' ? 'var(--status-day-bg)' : opt.key === 'relay' ? 'var(--status-pending-bg)' : 'var(--status-night-bg)') : 'var(--bg)', border: form.bin_type === opt.key ? (opt.key === 'day' ? '2px solid var(--ocean-light)' : opt.key === 'relay' ? '2px solid var(--gold)' : '2px solid var(--status-night-fg)') : '2px solid transparent' }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 700, color: form.bin_type === opt.key ? (opt.key === 'day' ? 'var(--ocean)' : opt.key === 'relay' ? 'var(--gold)' : 'var(--status-night-fg)') : 'var(--fg-3)' }}>{opt.label}</div>
                    <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginTop: '4px' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>営業シーズン</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select value={form.start_month} onChange={e => setForm(f => ({ ...f, start_month: Number(e.target.value) }))} style={{ ...inputStyle, flex: 1, padding: '12px 8px', fontWeight: 700 }}>
                  {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
                <span style={{ fontSize: '18px', color: 'var(--fg-2)', fontWeight: 700 }}>〜</span>
                <select value={form.end_month} onChange={e => setForm(f => ({ ...f, end_month: Number(e.target.value) }))} style={{ ...inputStyle, flex: 1, padding: '12px 8px', fontWeight: 700 }}>
                  {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              </div>
              {form.start_month > form.end_month && (
                <div style={{ fontSize: '14px', color: 'var(--status-pending-fg)', marginTop: '8px', padding: '6px 8px', background: 'var(--status-pending-bg)', borderRadius: '6px' }}>
                  ※ 年またぎシーズンとして設定されます（例：11月〜3月）
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>出る曜日</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {DAY_NAMES.map((name, i) => (
                  <button key={i} onClick={() => toggleDay(i)}
                    style={{ flex: 1, height: '64px', minWidth: '40px', borderRadius: '10px', fontSize: '18px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: form.days_of_week.includes(i) ? (form.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)') : 'var(--status-closed-bg)', color: form.days_of_week.includes(i) ? '#fff' : 'var(--fg-3)' }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>出発時刻</div>
              <input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} style={{ ...inputStyle, fontWeight: 700 }} />
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>
                終了予定時刻 <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400 }}>（任意）</span>
              </div>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                style={{ ...inputStyle, fontWeight: 700 }}
              />
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '10px' }}>定員（最大人数）</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} min={1} max={30} placeholder="例：8" style={{ ...inputStyle, flex: 1, fontSize: '24px', fontWeight: 700, textAlign: 'center' }} />
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)' }}>名</span>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '4px' }}>
                乗船料 <span style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 400 }}>（任意）</span>
              </div>
              <input type="text" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="例：お一人様 15,000円（エサ・氷代込み）" style={inputStyle} />
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '4px' }}>釣れる魚種（任意）</div>
              <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginBottom: '10px' }}>予約フォームに表示されます</div>
              {form.fish_types.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {form.fish_types.map(f => (
                    <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '18px', background: 'var(--status-day-bg)', color: 'var(--ocean)', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>
                      {f}
                      <button onClick={() => removeFish(f)} style={{ background: 'none', border: 'none', color: 'var(--ocean-light)', cursor: 'pointer', padding: '0', fontSize: '18px', lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={form.fish_input} onChange={e => setForm(f => ({ ...f, fish_input: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFish() } }} placeholder="例：マダイ" style={{ ...inputStyle, flex: 1, padding: '10px 12px' }} />
                <button onClick={addFish} disabled={!form.fish_input.trim()}
                  style={{ padding: '14px 16px', fontSize: '18px', fontWeight: 700, background: form.fish_input.trim() ? 'var(--ocean)' : 'var(--border)', color: form.fish_input.trim() ? '#fff' : 'var(--fg-3)', border: 'none', borderRadius: '8px', cursor: form.fish_input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  追加
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--status-full-bg)', border: '1px solid var(--status-full-bd)', borderRadius: '8px', padding: '16px', fontSize: '18px', color: 'var(--status-full-fg)' }}>
                {error}
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 700, background: saving ? 'var(--border)' : 'var(--ocean)', color: saving ? 'var(--fg-3)' : '#fff', border: 'none', borderRadius: '12px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? '保存中...' : editingId ? '変更を保存する' : 'この便を登録する'}
            </button>
            <button onClick={() => setView('list')}
              style={{ width: '100%', padding: '14px', fontSize: '18px', fontWeight: 700, background: 'transparent', color: 'var(--fg-2)', border: '2px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              キャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-2)', display: 'block', marginBottom: '6px' }}>
      {label}
    </label>
  )
}

function Legend({ bg, border, label }: { bg: string; border?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ width: '16px', height: '10px', borderRadius: '2px', background: bg, border: border ? `1px solid ${border}` : 'none' }} />
      <span style={{ fontSize: '12px', color: 'var(--fg-3)' }}>{label}</span>
    </div>
  )
}

function PlanCard({
  setting,
  seasonLabel,
  onEdit,
  onToggle,
  onDelete,
  deleting,
}: {
  setting: BinSetting
  seasonLabel: string
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const enabled = setting.enabled ?? true
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', opacity: enabled ? 1 : 0.7 }}>
      <div style={{ background: setting.bin_type === 'day' ? 'var(--status-day-bg)' : 'var(--status-night-bg)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>{setting.bin_type === 'day' ? '☀️' : '🌙'}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: setting.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)' }}>
            {setting.bin_type === 'day' ? '昼便' : '夜便'}　{setting.name}
          </span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: setting.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)' }}>
          {setting.departure_time} 出発{setting.end_time ? ` 〜 ${setting.end_time} 終了予定` : ''}
        </span>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <Meta label="シーズン" value={seasonLabel} />
          <Meta label="定員" value={`${setting.max_capacity}名`} />
        </div>
        {setting.price && (
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-2)', marginBottom: '8px' }}>
            💴 {setting.price}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: enabled ? 'var(--status-ok-bg)' : 'var(--status-closed-bg)', color: enabled ? 'var(--status-ok-fg)' : 'var(--fg-3)' }}>
            {enabled ? '受付中' : '受付中止'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {DAY_NAMES.map((name, i) => (
            <span key={i} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 700, background: setting.days_of_week.includes(i) ? (setting.bin_type === 'day' ? 'var(--ocean)' : 'var(--status-night-fg)') : 'var(--status-closed-bg)', color: setting.days_of_week.includes(i) ? '#fff' : 'var(--fg-3)' }}>
              {name}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--status-closed-bg)' }}>
        <ActionButton label="編集" color="var(--ocean-light)" onClick={onEdit} />
        <ActionButton label={enabled ? '受付中止' : '再開する'} color={enabled ? 'var(--status-pending-fg)' : 'var(--status-ok-fg)'} onClick={onToggle} />
        <ActionButton label={deleting ? '削除中...' : '削除'} color={deleting ? 'var(--fg-3)' : 'var(--status-full-fg)'} onClick={onDelete} disabled={deleting} last />
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--fg-3)', fontWeight: 700, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg-1)' }}>{value}</div>
    </div>
  )
}

function ActionButton({ label, color, onClick, disabled, last }: { label: string; color: string; onClick: () => void; disabled?: boolean; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ flex: 1, padding: '14px', fontSize: '16px', fontWeight: 700, background: disabled ? 'var(--border)' : 'var(--surface)', color, border: 'none', borderRight: last ? 'none' : '1px solid var(--border)', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
    >
      {label}
    </button>
  )
}
