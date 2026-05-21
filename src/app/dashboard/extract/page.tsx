'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, inputStyle, binBadgeStyle, binLabel, formatDate } from '../_components/CaptainShell'

type Tab = 'line' | 'instagram' | 'phone'
type SnsMessage = {
  id: string
  channel: 'line' | 'instagram'
  sender_name: string | null
  message_text: string
  received_at: string
  status: string
  ai_result: {
    missing_fields?: string[]
    confidence?: number
    reply_text?: string
    replyText?: string
    generated_reply?: string
    reply?: string
  } | null
}
type Customer = { id: string; name: string; tel: string; fishing_style?: string | null; memo?: string | null }
type BinSetting = { id: string; bin_type: 'day' | 'night' | 'relay'; name: string | null; days_of_week: number[]; start_month: number; end_month: number; max_capacity: number }
type OfflineMemo = { id: string; message: string; date: string; binType: string; count: number; savedAt: string }

const OFFLINE_KEY = 'fiship_offline_memos'

export default function ExtractPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [tab, setTab] = useState<Tab>('line')
  const [messages, setMessages] = useState<SnsMessage[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bins, setBins] = useState<BinSetting[]>([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [date, setDate] = useState('')
  const [binType, setBinType] = useState<'day' | 'night' | 'relay' | ''>('')
  const [count, setCount] = useState(1)
  const [memo, setMemo] = useState('')
  const [offlineMemos, setOfflineMemos] = useState<OfflineMemo[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [replyPreview, setReplyPreview] = useState<SnsMessage | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase.from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      const [{ data: msg }, { data: cs }, { data: bs }] = await Promise.all([
        supabase.from('sns_messages').select('*').eq('vessel_id', vessel.id).in('status', ['unprocessed', 'reply_failed']).order('received_at', { ascending: false }),
        supabase.from('customers').select('id, name, tel, memo, note').eq('vessel_id', vessel.id).order('name'),
        supabase.from('bin_settings').select('*').eq('vessel_id', vessel.id).eq('enabled', true),
      ])
      setMessages((msg || []) as SnsMessage[])
      setCustomers((cs || []) as Customer[])
      setBins((bs || []) as BinSetting[])
      const stored = localStorage.getItem(OFFLINE_KEY)
      if (stored) setOfflineMemos(JSON.parse(stored) as OfflineMemo[])
      setLoading(false)
    }
    init()
  }, [router])

  const candidateBins = useMemo(() => {
    if (!date) return bins
    const d = new Date(date + 'T00:00:00')
    const month = d.getMonth()
    const dow = d.getDay()
    return bins.filter(bin => {
      const inPeriod = bin.start_month <= bin.end_month ? bin.start_month <= month && month <= bin.end_month : month >= bin.start_month || month <= bin.end_month
      return inPeriod && bin.days_of_week.includes(dow)
    })
  }, [bins, date])

  useEffect(() => {
    if (candidateBins.length === 1) setBinType(candidateBins[0].bin_type)
  }, [candidateBins])

  const filteredCustomers = customers.filter(c => `${c.name} ${c.tel}`.includes(search))

  const saveOffline = () => {
    const item = { id: crypto.randomUUID(), message: memo, date, binType, count, savedAt: new Date().toISOString() }
    const next = [...offlineMemos, item]
    setOfflineMemos(next)
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(next))
    setNotice('電波が不安定なためメモとして保存しました')
  }

  const registerPhoneMemo = async (source?: OfflineMemo) => {
    const targetDate = source?.date || date
    const targetBin = (source?.binType || binType || candidateBins[0]?.bin_type || 'day') as 'day' | 'night' | 'relay'
    const targetCount = source?.count || count
    const targetMemo = source?.message || memo
    if (!targetDate || !selectedCustomer?.name) return
    setSaving(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vessel_id: vesselId, date: targetDate, bin_type: targetBin, name: selectedCustomer.name, tel: selectedCustomer.tel, count: targetCount, fishing_style: '', message: targetMemo, channel: 'phone', status: 'confirmed' }),
      })
      if (!res.ok) throw new Error('failed')
      if (source) {
        const next = offlineMemos.filter(m => m.id !== source.id)
        setOfflineMemos(next)
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(next))
      }
      setMemo('')
      setNotice('予約を登録しました')
      setTimeout(() => setNotice(''), 2500)
    } catch {
      saveOffline()
    } finally {
      setSaving(false)
    }
  }

  const ignoreMessage = async (id: string) => {
    await supabase.from('sns_messages').update({ status: 'ignored' }).eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const getReplyText = (msg: SnsMessage) => {
    return msg.ai_result?.reply_text
      || msg.ai_result?.replyText
      || msg.ai_result?.generated_reply
      || msg.ai_result?.reply
      || `ご連絡ありがとうございます。\n電波状況の良い場所から、船長が確認して返信します。\n\n元メッセージ：\n${msg.message_text}`
  }

  const copyReplyText = async (msg: SnsMessage) => {
    await navigator.clipboard.writeText(getReplyText(msg))
    setNotice('返信内容をコピーしました')
    setTimeout(() => setNotice(''), 2500)
  }

  if (loading) return <LoadingScreen />

  const tabMessages = messages.filter(m => m.channel === tab)

  return (
    <PageShell title="予約取り込み">
      {notice && <div style={{ ...cardStyle, background: colors.greenBg, color: colors.green }}>{notice}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {([{ key: 'line', label: 'LINE' }, { key: 'instagram', label: 'Instagram' }, { key: 'phone', label: '電話メモ' }] as { key: Tab; label: string }[]).map(item => <button key={item.key} onClick={() => setTab(item.key)} style={tab === item.key ? primaryButtonStyle : secondaryButtonStyle}>{item.label}</button>)}
      </div>

      {(tab === 'line' || tab === 'instagram') && (
        <section>
          {tabMessages.length === 0 && <div style={cardStyle}>手動対応が必要なメッセージはありません。</div>}
          {tabMessages.map(msg => {
            if (msg.status === 'reply_failed') {
              return (
                <div key={msg.id} style={{ ...cardStyle, border: `0.5px solid ${colors.amberBorder}`, background: colors.amberBg }}>
                  <div style={{ fontSize: '17px', fontWeight: 500, color: colors.amber, marginBottom: '8px' }}>返信できませんでした</div>
                  <div style={{ fontSize: '16px', color: colors.text, marginBottom: '6px' }}>{msg.sender_name || 'お客様'}様からのメッセージ</div>
                  <div style={{ fontSize: '15px', color: colors.sub, lineHeight: 1.7, marginBottom: '12px' }}>電波状況の良い場所で<br />再送してください</div>
                  <p style={{ fontSize: '15px', lineHeight: 1.7, color: colors.text, background: colors.card, border: `0.5px solid ${colors.border}`, borderRadius: '8px', padding: '12px' }}>{msg.message_text}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => setReplyPreview(msg)} style={primaryButtonStyle}>返信内容を確認する</button>
                    <button onClick={() => ignoreMessage(msg.id)} style={dangerButtonStyle}>対応済みにする</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} style={cardStyle}>
                <div style={{ color: colors.sub, marginBottom: '8px' }}>{msg.sender_name || '送信者未登録'} / {new Date(msg.received_at).toLocaleString('ja-JP')}</div>
                <p style={{ fontSize: '17px', lineHeight: 1.7 }}>{msg.message_text}</p>
                {msg.ai_result?.missing_fields?.length ? <div style={{ color: colors.amber }}>不足: {msg.ai_result.missing_fields.join('・')}</div> : <div style={{ color: colors.sub }}>解析できなかった内容です。</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={() => setTab('phone')} style={secondaryButtonStyle}>電話メモで登録</button>
                  <button onClick={() => ignoreMessage(msg.id)} style={dangerButtonStyle}>対応済みにする</button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {replyPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
          <div style={{ ...cardStyle, width: '100%', maxWidth: '440px', marginBottom: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 500, color: colors.text, marginBottom: '10px' }}>返信内容</div>
            <textarea readOnly value={getReplyText(replyPreview)} style={{ ...inputStyle, height: '180px', lineHeight: 1.7, marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => copyReplyText(replyPreview)} style={{ ...primaryButtonStyle, flex: 1 }}>コピーする</button>
              <button onClick={() => setReplyPreview(null)} style={{ ...secondaryButtonStyle, flex: 1 }}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'phone' && (
        <section>
          {offlineMemos.length > 0 && <div style={{ ...cardStyle, background: colors.amberBg }}><div style={{ fontWeight: 500, color: colors.amber }}>未送信メモ {offlineMemos.length}件</div>{offlineMemos.map(m => <div key={m.id} style={{ borderTop: `0.5px solid ${colors.amberBorder}`, paddingTop: '10px', marginTop: '10px' }}><div>{m.message || 'メモなし'} {m.date && formatDate(m.date)}</div><button onClick={() => registerPhoneMemo(m)} style={{ ...secondaryButtonStyle, marginTop: '8px' }}>登録する</button></div>)}</div>}
          <div style={cardStyle}>
            <label>顧客を選択</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・電話番号で検索" style={{ ...inputStyle, margin: '8px 0' }} />
            {search && filteredCustomers.slice(0, 5).map(c => <button key={c.id} onClick={() => { setSelectedCustomer(c); setSearch(c.name) }} style={{ ...secondaryButtonStyle, width: '100%', marginBottom: '6px', textAlign: 'left' }}>{c.name} 様 / {c.tel}</button>)}
            {selectedCustomer && <div style={{ ...cardStyle, background: '#F5F5F5' }}>{selectedCustomer.name} 様<br />{selectedCustomer.tel}<br />{selectedCustomer.memo || ''}</div>}
            <label>日程</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, margin: '8px 0 12px' }} />
            <label>便</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>{candidateBins.map(bin => <button key={bin.id} onClick={() => setBinType(bin.bin_type)} style={binType === bin.bin_type ? primaryButtonStyle : secondaryButtonStyle}><span style={binBadgeStyle(bin.bin_type)}>{bin.name || binLabel(bin.bin_type)}</span></button>)}</div>
            <label>人数</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '8px 0 12px' }}>{[1,2,3,4].map(n => <button key={n} onClick={() => setCount(n)} style={count === n ? primaryButtonStyle : secondaryButtonStyle}>{n}名</button>)}<button onClick={() => setCount(v => Math.max(1, v - 1))} style={secondaryButtonStyle}>-</button><span>{count}名</span><button onClick={() => setCount(v => v + 1)} style={secondaryButtonStyle}>+</button></div>
            <label>メモ</label><textarea value={memo} onChange={e => setMemo(e.target.value)} style={{ ...inputStyle, height: '90px', margin: '8px 0 14px' }} />
            <button disabled={saving || !selectedCustomer || !date} onClick={() => registerPhoneMemo()} style={{ ...primaryButtonStyle, width: '100%' }}>{saving ? '登録中...' : '登録する'}</button>
          </div>
        </section>
      )}
    </PageShell>
  )
}
