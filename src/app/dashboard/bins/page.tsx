'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, inputStyle, binBadgeStyle, binLabel } from '../_components/CaptainShell'

type BinType = 'day' | 'night' | 'relay'
type BinSetting = {
  id: string
  vessel_id: string
  name: string | null
  bin_type: BinType
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  end_time: string | null
  fish_types: string[]
  max_capacity: number
  price: string | null
  enabled: boolean
  note: string | null
  facilities_override: Record<string, unknown> | null
  period_type: 'monthly' | 'date'
  start_date: string | null
  end_date: string | null
}
type FormState = {
  id: string
  name: string
  bin_type: BinType
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  end_time: string
  max_capacity: string
  price: string
  note: string
  facilities_override_text: string
  period_type: 'monthly' | 'date'
  start_date: string
  end_date: string
}

const emptyForm = (): FormState => ({ id: '', name: '', bin_type: 'day', start_month: 0, end_month: 11, days_of_week: [0,1,2,3,4,5,6], departure_time: '06:00', end_time: '', max_capacity: '10', price: '', note: '', facilities_override_text: '', period_type: 'monthly', start_date: '', end_date: '' })

export default function BinsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [bins, setBins] = useState<BinSetting[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase.from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      const { data } = await supabase.from('bin_settings').select('*').eq('vessel_id', vessel.id).order('bin_type')
      setBins((data || []) as BinSetting[])
      setLoading(false)
    }
    init()
  }, [router])

  const startEdit = (bin?: BinSetting) => {
    if (!bin) {
      setForm(emptyForm())
      setEditing(true)
      return
    }
    setForm({
      id: bin.id,
      name: bin.name || '',
      bin_type: bin.bin_type,
      start_month: bin.start_month,
      end_month: bin.end_month,
      days_of_week: bin.days_of_week || [],
      departure_time: bin.departure_time || '06:00',
      end_time: bin.end_time || '',
      max_capacity: String(bin.max_capacity || 10),
      price: bin.price || '',
      note: bin.note || '',
      facilities_override_text: bin.facilities_override ? JSON.stringify(bin.facilities_override) : '',
      period_type: bin.period_type || 'monthly',
      start_date: bin.start_date || '',
      end_date: bin.end_date || '',
    })
    setEditing(true)
  }

  const toggleDay = (day: number) => setForm(f => ({ ...f, days_of_week: f.days_of_week.includes(day) ? f.days_of_week.filter(d => d !== day) : [...f.days_of_week, day] }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const facilitiesOverride = form.facilities_override_text.trim() ? { note: form.facilities_override_text.trim() } : null
      const resolvedName = form.name.trim() || (form.bin_type === 'relay' ? '昼夜便' : form.bin_type === 'night' ? '夜便' : '昼便')
      const payload = {
        vessel_id: vesselId,
        name: resolvedName,
        bin_type: form.bin_type,
        start_month: form.start_month,
        end_month: form.end_month,
        days_of_week: form.days_of_week,
        departure_time: form.departure_time,
        end_time: form.end_time || null,
        fish_types: [],
        max_capacity: Number(form.max_capacity),
        price: form.price,
        note: form.note,
        facilities_override: facilitiesOverride,
        period_type: form.period_type,
        start_date: form.period_type === 'date' ? form.start_date || null : null,
        end_date: form.period_type === 'date' ? form.end_date || form.start_date || null : null,
      }
      const res = await fetch('/api/bin-settings', { method: form.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '保存できませんでした'); return }
      setBins(prev => form.id ? prev.map(b => b.id === form.id ? data.setting : b) : [...prev, data.setting])
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (bin: BinSetting) => {
    const { data } = await supabase.from('bin_settings').update({ enabled: !bin.enabled }).eq('id', bin.id).select().single()
    if (data) setBins(prev => prev.map(b => b.id === bin.id ? data as BinSetting : b))
  }

  const deleteBin = async (bin: BinSetting) => {
    await fetch(`/api/bin-settings?id=${bin.id}`, { method: 'DELETE' })
    setBins(prev => prev.filter(b => b.id !== bin.id))
  }

  if (loading) return <LoadingScreen />

  return (
    <PageShell title="便設定" back>
      {!editing && (
        <>
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '3px', marginBottom: '10px', color: colors.sub, fontSize: '12px' }}>
              {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ textAlign: 'center' }}>{i + 1}</div>)}
            </div>
            {bins.map(bin => (
              <div key={bin.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr) 64px', gap: '3px', alignItems: 'center', marginBottom: '8px' }}>
                {Array.from({ length: 12 }, (_, i) => {
                  const active = bin.start_month <= bin.end_month ? bin.start_month <= i && i <= bin.end_month : i >= bin.start_month || i <= bin.end_month
                  return <div key={i} style={{ height: '12px', borderRadius: '8px', background: active ? colors.action : colors.border, opacity: bin.enabled ? 1 : 0.3 }} />
                })}
                <span style={{ fontSize: '12px', color: bin.enabled ? colors.text : colors.weak }}>{bin.name || binLabel(bin.bin_type)}</span>
              </div>
            ))}
          </div>

          {bins.map(bin => (
            <div key={bin.id} style={{ ...cardStyle, background: bin.enabled ? colors.card : '#F5F5F5', color: bin.enabled ? colors.text : colors.weak }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <div><span style={binBadgeStyle(bin.bin_type)}>{bin.name || binLabel(bin.bin_type)}</span></div>
                <span>{bin.enabled ? '有効' : '停止中'}</span>
              </div>
              <div style={{ color: bin.enabled ? colors.sub : colors.weak, lineHeight: 1.7 }}>{bin.departure_time} 出発 {bin.end_time ? `〜 ${bin.end_time}` : ''}<br />定員 {bin.max_capacity}名 / {bin.price || '料金未設定'}</div>
              {bin.note && <p style={{ color: colors.sub }}>{bin.note}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => startEdit(bin)} style={secondaryButtonStyle}>編集</button>
                <button onClick={() => toggleEnabled(bin)} style={secondaryButtonStyle}>{bin.enabled ? '受付停止' : '再開'}</button>
                <button onClick={() => deleteBin(bin)} style={dangerButtonStyle}>削除</button>
              </div>
            </div>
          ))}
          <button onClick={() => startEdit()} style={{ ...primaryButtonStyle, width: '100%' }}>便を追加する</button>
        </>
      )}

      {editing && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>{form.id ? '便を編集' : '便を追加'}</h2>
          {error && <div style={{ ...cardStyle, background: colors.redBg, color: colors.action }}>{error}</div>}
          <label>便の種類</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>
            {(['day','night','relay'] as BinType[]).map(type => <button key={type} onClick={() => setForm(f => ({ ...f, bin_type: type, name: f.name || (type === 'relay' ? '昼夜便' : type === 'night' ? '夜便' : '昼便') }))} style={form.bin_type === type ? primaryButtonStyle : secondaryButtonStyle}>{binLabel(type)}</button>)}
          </div>
          <label>便名</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
          <label>期間</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>
            <button onClick={() => setForm(f => ({ ...f, period_type: 'monthly' }))} style={form.period_type === 'monthly' ? primaryButtonStyle : secondaryButtonStyle}>月単位</button>
            <button onClick={() => setForm(f => ({ ...f, period_type: 'date' }))} style={form.period_type === 'date' ? primaryButtonStyle : secondaryButtonStyle}>日付指定</button>
          </div>
          {form.period_type === 'monthly' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <select value={form.start_month} onChange={e => setForm(f => ({ ...f, start_month: Number(e.target.value) }))} style={inputStyle}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i + 1}月</option>)}</select>
              <select value={form.end_month} onChange={e => setForm(f => ({ ...f, end_month: Number(e.target.value) }))} style={inputStyle}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i + 1}月</option>)}</select>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
            </div>
          )}
          <label>曜日</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', margin: '8px 0 12px' }}>{['日','月','火','水','木','金','土'].map((d, i) => <button key={d} onClick={() => toggleDay(i)} style={form.days_of_week.includes(i) ? primaryButtonStyle : secondaryButtonStyle}>{d}</button>)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div><label>出発時刻</label><input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} style={{ ...inputStyle, marginTop: '8px' }} /></div>
            <div><label>終了予定</label><input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={{ ...inputStyle, marginTop: '8px' }} /></div>
          </div>
          <label style={{ display: 'block', marginTop: '12px' }}>定員</label><input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
          <label>料金</label><input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
          <label>案内テキスト・持ち物</label><textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ ...inputStyle, height: '88px', margin: '8px 0 12px' }} />
          <label>設備の上書き</label><textarea value={form.facilities_override_text} onChange={e => setForm(f => ({ ...f, facilities_override_text: e.target.value }))} style={{ ...inputStyle, height: '72px', margin: '8px 0 12px' }} />
          <div style={{ display: 'grid', gap: '8px' }}>
            <button disabled={saving} onClick={save} style={primaryButtonStyle}>{saving ? '保存中...' : '保存する'}</button>
            <button onClick={() => setEditing(false)} style={secondaryButtonStyle}>戻る</button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
