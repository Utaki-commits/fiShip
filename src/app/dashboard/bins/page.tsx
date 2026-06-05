'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CaptainHeader from '@/components/CaptainHeader'
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
  period_type: 'monthly' | 'date'
  start_date: string
  end_date: string
}

const emptyForm = (): FormState => ({ id: '', name: '', bin_type: 'day', start_month: 0, end_month: 11, days_of_week: [0,1,2,3,4,5,6], departure_time: '06:00', end_time: '', max_capacity: '10', price: '', note: '', period_type: 'monthly', start_date: '', end_date: '' })

const binTypeColors: Record<BinType, string[]> = {
  day: ['#1A6B8A', '#5BA3C0', '#8EC5D8', '#B9DDEA'],
  night: ['#4A3580', '#7A65B0', '#A293CC', '#C8BFE0'],
  relay: ['#2D7A4F', '#5DAA7F', '#8EC8A5', '#BFE0CC'],
}

const inactiveMonthColor = '#E5E7EB'

const getBinGaugeColor = (bin: BinSetting, allBins: BinSetting[]) => {
  const sameTypeBins = allBins.filter(item => item.bin_type === bin.bin_type)
  const index = sameTypeBins.findIndex(item => item.id === bin.id)
  const palette = binTypeColors[bin.bin_type]
  return palette[Math.max(0, Math.min(index, palette.length - 1))]
}

const isActiveMonth = (bin: BinSetting, monthIndex: number) => (
  bin.start_month <= bin.end_month
    ? bin.start_month <= monthIndex && monthIndex <= bin.end_month
    : monthIndex >= bin.start_month || monthIndex <= bin.end_month
)

const statusBadgeStyle = (enabled: boolean) => ({
  background: enabled ? '#DCFCE7' : '#E5E7EB',
  color: enabled ? '#166534' : '#6B7280',
  borderRadius: '999px',
  padding: '4px 10px',
  fontSize: '13px',
  fontWeight: 500,
})

const actionButtonStyle = { width: '96px', whiteSpace: 'nowrap' as const }
const toggleButtonStyle = { ...secondaryButtonStyle, ...actionButtonStyle }

const deleteButtonStyle = {
  ...dangerButtonStyle,
  ...actionButtonStyle,
  border: '1px solid #CDD3DC',
  background: '#FFFFFF',
  color: '#B91C1C',
}

const formatPrice = (price: string | null) => {
  if (!price) return '料金未設定'
  const numericPrice = Number(price)
  if (Number.isNaN(numericPrice)) return price
  return `${numericPrice.toLocaleString('ja-JP')}円`
}

export default function BinsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [bins, setBins] = useState<BinSetting[]>([])
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BinSetting | null>(null)

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
      const isExisting = Boolean(form.id)
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
        facilities_override: null,
        period_type: form.period_type,
        start_date: form.period_type === 'date' ? form.start_date || null : null,
        end_date: form.period_type === 'date' ? form.end_date || form.start_date || null : null,
      }
      const res = await fetch('/api/bin-settings', { method: isExisting ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isExisting ? { id: form.id, ...payload } : payload) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '保存できませんでした'); return }
      setBins(prev => isExisting ? prev.map(b => b.id === form.id ? data.setting : b) : [...prev, data.setting])
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('setup') === 'true') {
        router.push('/dashboard/setup?step=3')
        return
      }
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
    setDeleteTarget(null)
  }

  if (loading) return <LoadingScreen />

  return (
    <PageShell title="便設定" menu hero={<CaptainHeader vesselId={vesselId} />}>
      {!editing && (
        <>
          {bins.length === 0 ? (
            <div style={{ ...cardStyle, padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: colors.text, marginBottom: '18px' }}>
                まだ便が登録されていません
              </div>
              <div style={{ fontSize: '15px', color: '#5A6A78', lineHeight: 1.8, marginBottom: '22px' }}>
                出船する便を追加して<br />
                予約を受け付けましょう
              </div>
              <button onClick={() => startEdit()} style={{ ...primaryButtonStyle, width: '100%', padding: '16px' }}>＋ 便を追加する</button>
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: '18px 14px' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: colors.text, marginBottom: '12px' }}>営業期間</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(56px, 80px) repeat(12, minmax(0, 1fr))', gap: '2px', marginBottom: '6px', color: colors.sub, fontSize: '12px' }}>
                <div />
                {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ textAlign: 'center' }}>{i + 1}</div>)}
              </div>
              {bins.map(bin => (
                <div key={bin.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(56px, 80px) repeat(12, minmax(0, 1fr))', gap: '2px', alignItems: 'center', marginBottom: '8px', opacity: bin.enabled ? 1 : 0.3 }}>
                  <span style={{ fontSize: '11px', color: bin.enabled ? colors.text : colors.weak, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bin.name || binLabel(bin.bin_type)}</span>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        height: '20px',
                        borderRadius: '6px',
                        background: isActiveMonth(bin, i) ? getBinGaugeColor(bin, bins) : inactiveMonthColor,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {bins.map(bin => (
            <div key={bin.id} style={{ ...cardStyle, background: bin.enabled ? colors.card : '#F5F5F5', color: bin.enabled ? colors.text : colors.weak }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                <div><span style={binBadgeStyle(bin.bin_type)}>{bin.name || binLabel(bin.bin_type)}</span></div>
                <span style={statusBadgeStyle(bin.enabled)}>{bin.enabled ? '有効' : '停止中'}</span>
              </div>
              <div style={{ color: bin.enabled ? colors.sub : colors.weak, lineHeight: 1.7 }}>{bin.departure_time} 出発 {bin.end_time ? `〜 ${bin.end_time}` : ''}<br />定員 {bin.max_capacity}名 / {formatPrice(bin.price)}</div>
              {bin.note && <p style={{ color: colors.sub }}>{bin.note}</p>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => startEdit(bin)} style={{ ...secondaryButtonStyle, ...actionButtonStyle }}>編集</button>
                <button onClick={() => toggleEnabled(bin)} style={toggleButtonStyle}>{bin.enabled ? '受付停止' : '再開'}</button>
                <button onClick={() => setDeleteTarget(bin)} style={deleteButtonStyle}>削除</button>
              </div>
            </div>
          ))}
          {bins.length > 0 && <button onClick={() => startEdit()} style={{ ...primaryButtonStyle, width: '100%' }}>便を追加する</button>}
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
            <div><label>終了予定時刻</label><input type="time" placeholder="例：13:00" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={{ ...inputStyle, marginTop: '8px', fontSize: '16px' }} /></div>
          </div>
          <label style={{ display: 'block', marginTop: '12px' }}>定員</label><input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
          <label>料金</label><input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
          <label>乗船客への案内（持ち物・注意事項など）</label><textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="例：タイラバ・イカメタルをご持参ください" style={{ ...inputStyle, height: '88px', margin: '8px 0 12px' }} />
          <div style={{ display: 'grid', gap: '8px' }}>
            <button disabled={saving} onClick={save} style={primaryButtonStyle}>{saving ? '保存中...' : '保存する'}</button>
            <button onClick={() => setEditing(false)} style={secondaryButtonStyle}>戻る</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{ ...cardStyle, width: '100%', maxWidth: '360px', marginBottom: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 500, color: colors.text, marginBottom: '8px' }}>
              {deleteTarget.name || binLabel(deleteTarget.bin_type)}を削除しますか？
            </div>
            <div style={{ fontSize: '14px', color: colors.sub, lineHeight: 1.7, marginBottom: '18px' }}>
              削除すると元に戻せません。
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => deleteBin(deleteTarget)} style={deleteButtonStyle}>削除</button>
              <button onClick={() => setDeleteTarget(null)} style={{ ...secondaryButtonStyle, ...actionButtonStyle }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
