'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FaInstagram, FaLine } from 'react-icons/fa'
import CaptainHeader from '@/components/CaptainHeader'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, inputStyle, binLabel, formatDate } from '../_components/CaptainShell'

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
const labelStyle = { display: 'block', fontSize: '14px', color: '#1A2420', fontWeight: 500, marginBottom: '8px' } as const
const extractPrimaryButtonStyle = { ...primaryButtonStyle, fontSize: '15px' } as const
const extractSecondaryButtonStyle = { ...secondaryButtonStyle, fontSize: '15px' } as const
const extractTabActiveStyle = {
  minHeight: '44px',
  padding: '10px 12px',
  border: `0.5px solid ${colors.header}`,
  borderRadius: '9px',
  background: colors.header,
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
} as const
const extractTabInactiveStyle = {
  ...extractTabActiveStyle,
  border: `0.5px solid ${colors.border}`,
  background: '#F3F4F6',
  color: colors.text,
} as const
const extractCompleteButtonStyle = {
  ...extractPrimaryButtonStyle,
  width: '96px',
  minWidth: '96px',
  padding: '12px 10px',
  background: colors.action,
  whiteSpace: 'nowrap',
} as const
const extractCardActionButtonStyle = {
  ...extractSecondaryButtonStyle,
  width: '96px',
  minWidth: '96px',
  padding: '12px 10px',
  whiteSpace: 'nowrap',
} as const
const formatReceivedAt = (value: string) => {
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}
const hasAnalysisFailure = (msg: SnsMessage) => {
  if (!msg.ai_result) return true
  if (Array.isArray(msg.ai_result.missing_fields) && msg.ai_result.missing_fields.length > 0) return false
  return Object.keys(msg.ai_result).length === 0
}
const focusedInputStyle = {
  ...inputStyle,
  border: `0.5px solid ${colors.header}`,
} as const
const stepperButtonStyle = {
  ...extractSecondaryButtonStyle,
  width: '44px',
  minWidth: '44px',
  height: '44px',
  minHeight: '44px',
  padding: 0,
  fontSize: '20px',
} as const
const binButtonColors = {
  day: '#F59E0B',
  night: '#1A3A5C',
  relay: '#2D7A4F',
} as const
const phoneBinButtonStyle = (binTypeValue: 'day' | 'night' | 'relay', selected: boolean) => ({
  ...extractSecondaryButtonStyle,
  minHeight: '44px',
  background: selected ? binButtonColors[binTypeValue] : '#F3F4F6',
  border: selected ? `0.5px solid ${binButtonColors[binTypeValue]}` : `0.5px solid ${colors.border}`,
  color: selected ? '#FFFFFF' : colors.text,
} as const)

export default function ExtractPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [tab, setTab] = useState<Tab>('line')
  const [messages, setMessages] = useState<SnsMessage[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bins, setBins] = useState<BinSetting[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerTel, setCustomerTel] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [nameFocused, setNameFocused] = useState(false)
  const [telFocused, setTelFocused] = useState(false)
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

  const selectedBin = candidateBins.find(bin => bin.bin_type === binType)
  const maxCount = selectedBin?.max_capacity || 99
  const filteredCustomers = customerName ? customers.filter(c => `${c.name} ${c.tel}`.includes(customerName)) : []

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
    const targetName = selectedCustomer?.name || customerName.trim()
    const targetTel = selectedCustomer?.tel || customerTel.trim()
    if (!targetDate || !targetName) return
    setSaving(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vessel_id: vesselId, date: targetDate, bin_type: targetBin, name: targetName, tel: targetTel, count: targetCount, fishing_style: '', message: targetMemo, channel: 'phone', status: 'confirmed' }),
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
    <PageShell title="電話メモ・予約登録" menu hero={<CaptainHeader vesselId={vesselId} />}>
      {notice && <div style={{ ...cardStyle, background: colors.greenBg, color: colors.green }}>{notice}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        {([{ key: 'line', label: 'LINE' }, { key: 'instagram', label: 'Instagram' }, { key: 'phone', label: '電話メモ' }] as { key: Tab; label: string }[]).map(item => (
          <button key={item.key} onClick={() => setTab(item.key)} style={tab === item.key ? extractTabActiveStyle : extractTabInactiveStyle}>
            {item.key === 'line' && <FaLine color="#06C755" size={20} />}
            {item.key === 'instagram' && <FaInstagram color="#E1306C" size={20} />}
            {item.label}
          </button>
        ))}
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
                    <button onClick={() => setReplyPreview(msg)} style={extractPrimaryButtonStyle}>返信内容を確認する</button>
                    <button onClick={() => ignoreMessage(msg.id)} style={extractCompleteButtonStyle}>対応済みにする</button>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} style={cardStyle}>
                <div style={{ color: colors.sub, marginBottom: '8px' }}>{msg.sender_name || '送信者未登録'} / {formatReceivedAt(msg.received_at)}</div>
                <p style={{ fontSize: '17px', lineHeight: 1.7 }}>{msg.message_text}</p>
                {msg.ai_result?.missing_fields?.length ? <div style={{ color: colors.amber }}>不足: {msg.ai_result.missing_fields.join('・')}</div> : hasAnalysisFailure(msg) && <div style={{ color: colors.sub }}>解析できなかった内容です。</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={() => setTab('phone')} style={extractCardActionButtonStyle}>電話メモで登録</button>
                  <button onClick={() => ignoreMessage(msg.id)} style={extractCompleteButtonStyle}>対応済みにする</button>
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
              <button onClick={() => copyReplyText(replyPreview)} style={{ ...extractPrimaryButtonStyle, flex: 1 }}>コピーする</button>
              <button onClick={() => setReplyPreview(null)} style={{ ...extractSecondaryButtonStyle, flex: 1 }}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'phone' && (
        <section>
          {offlineMemos.length > 0 && <div style={{ ...cardStyle, background: colors.amberBg }}><div style={{ fontWeight: 500, color: colors.amber }}>未送信メモ {offlineMemos.length}件</div>{offlineMemos.map(m => <div key={m.id} style={{ borderTop: `0.5px solid ${colors.amberBorder}`, paddingTop: '10px', marginTop: '10px' }}><div>{m.message || 'メモなし'} {m.date && formatDate(m.date)}</div><button onClick={() => registerPhoneMemo(m)} style={{ ...extractSecondaryButtonStyle, marginTop: '8px' }}>登録する</button></div>)}</div>}
          <div style={cardStyle}>
            <label style={labelStyle}>氏名</label>
            <input value={customerName} onFocus={() => setNameFocused(true)} onBlur={() => setTimeout(() => setNameFocused(false), 150)} onChange={e => { setCustomerName(e.target.value); setSelectedCustomer(null) }} placeholder="例：田中太郎" style={{ ...(nameFocused ? focusedInputStyle : inputStyle), margin: '8px 0' }} />
            {nameFocused && filteredCustomers.slice(0, 5).map(c => <button key={c.id} onMouseDown={() => { setSelectedCustomer(c); setCustomerName(c.name); setCustomerTel(c.tel) }} style={{ ...extractSecondaryButtonStyle, width: '100%', marginBottom: '6px', textAlign: 'left' }}>{c.name} 様 / {c.tel}</button>)}
            {selectedCustomer && <div style={{ ...cardStyle, background: '#F5F5F5' }}>{selectedCustomer.name} 様<br />{selectedCustomer.tel}<br />{selectedCustomer.memo || ''}</div>}
            <label style={labelStyle}>電話番号</label>
            <input value={customerTel} onFocus={() => setTelFocused(true)} onBlur={() => setTelFocused(false)} onChange={e => { setCustomerTel(e.target.value); setSelectedCustomer(null) }} placeholder="例：09012345678" style={{ ...(telFocused ? focusedInputStyle : inputStyle), margin: '8px 0 12px' }} />
            <label style={labelStyle}>日程</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, margin: '8px 0 12px' }} />
            <label style={labelStyle}>便</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>{candidateBins.map(bin => <button key={bin.id} onClick={() => setBinType(bin.bin_type)} style={phoneBinButtonStyle(bin.bin_type, binType === bin.bin_type)}>{bin.name || binLabel(bin.bin_type)}</button>)}</div>
            <label style={labelStyle}>人数</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', margin: '8px 0 12px' }}>
              <button onClick={() => setCount(v => Math.max(1, v - 1))} disabled={count <= 1} style={stepperButtonStyle}>-</button>
              <span style={{ minWidth: '64px', textAlign: 'center', fontSize: '16px', fontWeight: 500 }}>{count}名</span>
              <button onClick={() => setCount(v => Math.min(maxCount, v + 1))} disabled={count >= maxCount} style={stepperButtonStyle}>+</button>
            </div>
            <label style={labelStyle}>メモ</label><textarea value={memo} onChange={e => setMemo(e.target.value)} style={{ ...inputStyle, height: '90px', margin: '8px 0 14px' }} />
            <button disabled={saving || !customerName.trim() || !date} onClick={() => registerPhoneMemo()} style={{ ...extractPrimaryButtonStyle, width: '100%' }}>{saving ? '登録中...' : '登録する'}</button>
          </div>
        </section>
      )}
    </PageShell>
  )
}
