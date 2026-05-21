'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, inputStyle, StatusPill, formatDate } from '../_components/CaptainShell'

type Customer = { id: string; vessel_id: string; name: string; tel: string; address: string | null; age: number | null; gender: string | null; emergency_contact: string | null; emergency_contact_relation: string | null; is_blacklisted: boolean; memo: string | null; note: string | null }
type Booking = { id: string; customer_id: string | null; name: string; tel: string; date: string; bin_type: string; fishing_style: string | null; count: number; status: string }
type CustomerWithStats = Customer & { visits: number; lastDate: string; styles: string[]; history: Booking[] }

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [vipThreshold, setVipThreshold] = useState(5)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CustomerWithStats | null>(null)
  const [memo, setMemo] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase.from('vessels').select('id, vip_threshold').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      setVipThreshold(vessel.vip_threshold || 5)
      const [{ data: cs }, { data: bk }] = await Promise.all([
        supabase.from('customers').select('*').eq('vessel_id', vessel.id).order('name'),
        supabase.from('bookings').select('id, customer_id, name, tel, date, bin_type, fishing_style, count, status').eq('vessel_id', vessel.id).eq('status', 'confirmed').order('date', { ascending: false }),
      ])
      setCustomers((cs || []) as Customer[])
      setBookings((bk || []) as Booking[])
      setLoading(false)
    }
    init()
  }, [router])

  const withStats = useMemo<CustomerWithStats[]>(() => customers.map(c => {
    const history = bookings.filter(b => (b.customer_id && b.customer_id === c.id) || (!!c.tel && b.tel === c.tel))
    const styles = Array.from(new Set(history.map(b => b.fishing_style).filter((v): v is string => Boolean(v))))
    return { ...c, visits: history.length, lastDate: history[0]?.date || '', styles, history }
  }).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || '')), [customers, bookings])

  const filtered = withStats.filter(c => `${c.name} ${c.tel}`.includes(search))

  const saveVip = async (next: number) => {
    setVipThreshold(next)
    if (vesselId) await supabase.from('vessels').update({ vip_threshold: next }).eq('id', vesselId)
  }

  const updateCustomer = async (customer: CustomerWithStats, payload: Partial<Customer>) => {
    const { data } = await supabase.from('customers').update(payload).eq('id', customer.id).select().single()
    if (data) {
      setCustomers(prev => prev.map(c => c.id === customer.id ? data as Customer : c))
      const refreshed = { ...customer, ...data } as CustomerWithStats
      setSelected(refreshed)
      setMemo(refreshed.memo || refreshed.note || '')
      setSaved('保存しました')
      setTimeout(() => setSaved(''), 2000)
    }
  }

  if (loading) return <LoadingScreen />

  if (selected) {
    return (
      <PageShell title="顧客詳細">
        {saved && <div style={{ ...cardStyle, background: colors.greenBg, color: colors.green }}>{saved}</div>}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 500, margin: 0, flex: 1 }}>{selected.name} 様</h2>
            {selected.tel && <button onClick={() => { window.location.href = `tel:${selected.tel}` }} style={primaryButtonStyle}>電話する</button>}
          </div>
          <div style={{ color: colors.sub, lineHeight: 1.8 }}>電話: {selected.tel || '未登録'}<br />住所: {selected.address || '未登録'}<br />年齢: {selected.age || '未登録'} / 性別: {selected.gender || '未登録'}<br />緊急連絡先: {selected.emergency_contact || '未登録'} {selected.emergency_contact_relation || ''}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            <StatusPill tone="green">来船 {selected.visits}回</StatusPill>
            {selected.lastDate && <StatusPill tone="gray">最終 {formatDate(selected.lastDate)}</StatusPill>}
            {selected.visits >= vipThreshold && <StatusPill tone="green">常連</StatusPill>}
            {selected.is_blacklisted && <StatusPill tone="red">要注意</StatusPill>}
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>メモ</h3>
          <textarea value={memo} onChange={e => setMemo(e.target.value)} style={{ ...inputStyle, minHeight: '120px' }} />
          <button onClick={() => updateCustomer(selected, { memo })} style={{ ...primaryButtonStyle, width: '100%', marginTop: '10px' }}>保存する</button>
        </div>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>来船履歴</h3>
          {selected.history.length === 0 && <div style={{ color: colors.sub }}>履歴はありません。</div>}
          {selected.history.map(h => <div key={h.id} style={{ borderTop: `0.5px solid ${colors.border}`, padding: '10px 0' }}>{formatDate(h.date)} / {h.count}名 / {h.fishing_style || '釣り方未登録'}</div>)}
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          <button onClick={() => updateCustomer(selected, { is_blacklisted: !selected.is_blacklisted })} style={selected.is_blacklisted ? secondaryButtonStyle : dangerButtonStyle}>{selected.is_blacklisted ? '要注意を解除' : '要注意顧客に登録'}</button>
          <button onClick={() => setSelected(null)} style={secondaryButtonStyle}>一覧へ戻る</button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="顧客名簿">
      <div style={cardStyle}>
        <label>検索</label>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・電話番号" style={{ ...inputStyle, margin: '8px 0 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.sub }}>常連の基準: {vipThreshold}回以上</span>
          <button onClick={() => saveVip(Math.max(1, vipThreshold - 1))} style={secondaryButtonStyle}>-</button>
          <button onClick={() => saveVip(vipThreshold + 1)} style={secondaryButtonStyle}>+</button>
        </div>
      </div>
      {filtered.length === 0 && <div style={cardStyle}>顧客情報はまだありません。</div>}
      {filtered.map(c => (
        <button key={c.id} onClick={() => { setSelected(c); setMemo(c.memo || c.note || '') }} style={{ ...cardStyle, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: 500 }}>{c.name} 様</span>
            {c.visits >= vipThreshold && <StatusPill tone="green">常連</StatusPill>}
            {c.is_blacklisted && <StatusPill tone="red">要注意</StatusPill>}
          </div>
          <div style={{ color: colors.sub, marginTop: '6px' }}>{c.tel || '電話未登録'} / 来船 {c.visits}回 {c.lastDate ? `/ 最終 ${formatDate(c.lastDate)}` : ''}</div>
        </button>
      ))}
    </PageShell>
  )
}
