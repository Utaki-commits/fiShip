'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, inputStyle, formatDate } from '../_components/CaptainShell'

type BlockType = 'maintenance' | 'weather' | 'trouble' | 'other'
type BlockedDate = { id: string; vessel_id: string; date_from: string; date_to: string; bin_type: string | null; type: BlockType; reason: string | null }
const types: { key: BlockType; label: string }[] = [
  { key: 'maintenance', label: 'メンテナンス' },
  { key: 'weather', label: '天候不順' },
  { key: 'trouble', label: 'トラブル' },
  { key: 'other', label: 'その他' },
]

export default function BlockedDatesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [items, setItems] = useState<BlockedDate[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [binType, setBinType] = useState('')
  const [type, setType] = useState<BlockType>('maintenance')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase.from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      const { data } = await supabase.from('blocked_dates').select('*').eq('vessel_id', vessel.id).order('date_from', { ascending: true })
      setItems((data || []) as BlockedDate[])
      setLoading(false)
    }
    init()
  }, [router])

  const save = async () => {
    if (!dateFrom || !vesselId) return
    setSaving(true)
    try {
      const { data } = await supabase.from('blocked_dates').insert([{ vessel_id: vesselId, date_from: dateFrom, date_to: dateTo || dateFrom, bin_type: binType || null, type, reason }]).select().single()
      if (data) setItems(prev => [...prev, data as BlockedDate].sort((a, b) => a.date_from.localeCompare(b.date_from)))
      setDateFrom(''); setDateTo(''); setBinType(''); setReason('')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    await supabase.from('blocked_dates').delete().eq('id', id)
    setItems(prev => prev.filter(item => item.id !== id))
  }

  if (loading) return <LoadingScreen />

  return (
    <PageShell title="休船日" back>
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>休船日を登録</h2>
        <label>期間</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); if (!dateTo) setDateTo(e.target.value) }} style={inputStyle} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        <label>対象便</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>
          {[{ key: '', label: '全便' }, { key: 'day', label: '昼便のみ' }, { key: 'night', label: '夜便のみ' }].map(opt => <button key={opt.key} onClick={() => setBinType(opt.key)} style={binType === opt.key ? primaryButtonStyle : secondaryButtonStyle}>{opt.label}</button>)}
        </div>
        <label>種別</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>
          {types.map(opt => <button key={opt.key} onClick={() => setType(opt.key)} style={type === opt.key ? primaryButtonStyle : secondaryButtonStyle}>{opt.label}</button>)}
        </div>
        <label>理由メモ</label>
        <input value={reason} onChange={e => setReason(e.target.value)} style={{ ...inputStyle, margin: '8px 0 14px' }} />
        <button disabled={saving} onClick={save} style={{ ...primaryButtonStyle, width: '100%' }}>{saving ? '登録中...' : '休船日を登録する'}</button>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '18px 0 10px' }}>登録済み</h2>
      {items.length === 0 && <div style={cardStyle}>休船日は登録されていません。</div>}
      {items.map(item => (
        <div key={item.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 500 }}>{formatDate(item.date_from)}{item.date_from !== item.date_to ? ` 〜 ${formatDate(item.date_to)}` : ''}</div>
              <div style={{ color: colors.sub, marginTop: '4px' }}>{types.find(t => t.key === item.type)?.label || 'その他'} {item.reason || ''}</div>
            </div>
            <button onClick={() => remove(item.id)} style={dangerButtonStyle}>削除</button>
          </div>
        </div>
      ))}
    </PageShell>
  )
}
