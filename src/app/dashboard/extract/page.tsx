'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type SnsMessage = {
  id: string
  channel: 'line' | 'instagram'
  sender_id: string
  sender_name: string | null
  message_text: string
  received_at: string
  ai_result: {
    name: string | null
    date: string | null
    count: number | null
    fishing_style: string | null
    is_booking: boolean
    confidence: number
  } | null
  status: 'unprocessed' | 'registered' | 'ignored'
}

type ExtractResult = {
  extracted: {
    name: string | null
    date: string | null
    count: number | null
    fishing_style: string | null
    bin_preference: string
    is_charter: boolean
    missing_fields: string[]
    confidence: number
  }
  availability: 'open' | 'full' | 'charter'
  altDates: { date: string; remaining: number }[]
}

type Tab = 'line' | 'instagram' | 'tel'

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
}

const formatRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min}分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}時間前`
  const day = Math.floor(hour / 24)
  return `${day}日前`
}

const AVAILABILITY_STYLE = {
  open: { bg: 'var(--status-day-bg)', color: 'var(--ocean)', label: '空きあり' },
  full: { bg: 'var(--status-full-bg)', color: 'var(--status-full-fg)', label: '満員' },
  charter: { bg: 'var(--status-pending-bg)', color: 'var(--status-pending-fg)', label: '貸切' },
}

const FIELD_LABELS: Record<string, string> = {
  name: '名前',
  date: '日付',
  count: '人数',
}

export default function ExtractPage() {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('line')

  const [snsMessages, setSnsMessages] = useState<SnsMessage[]>([])
  const [snsLoading, setSnsLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState({ name: '', date: '', count: '' })
  const [registering, setRegistering] = useState<string | null>(null)
  const [batchRegistering, setBatchRegistering] = useState(false)

  const [telMessage, setTelMessage] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [telResult, setTelResult] = useState<ExtractResult | null>(null)
  const [telError, setTelError] = useState('')
  const [telSaving, setTelSaving] = useState(false)
  const [telSaved, setTelSaved] = useState(false)
  const [telEditedFields, setTelEditedFields] = useState({ name: '', date: '', count: '' })

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
    }
    init()
  }, [router])

  const fetchSnsMessages = useCallback(async (channel: 'line' | 'instagram') => {
    if (!vesselId) return
    setSnsLoading(true)
    const { data } = await supabase
      .from('sns_messages')
      .select('*')
      .eq('vessel_id', vesselId)
      .eq('channel', channel)
      .eq('status', 'unprocessed')
      .order('received_at', { ascending: false })
    setSnsMessages(data || [])
    setSnsLoading(false)
  }, [vesselId])

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    setExpandedId(null)
    setTelResult(null)
    setTelSaved(false)
    setTelError('')
    setTelMessage('')
  }

  useEffect(() => {
    if (vesselId && (tab === 'line' || tab === 'instagram')) {
      fetchSnsMessages(tab)
    }
  }, [vesselId, tab, fetchSnsMessages])

  const handleExpand = (msg: SnsMessage) => {
    if (expandedId === msg.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(msg.id)
    setEditedFields({
      name: msg.ai_result?.name || '',
      date: msg.ai_result?.date || '',
      count: msg.ai_result?.count ? String(msg.ai_result.count) : '',
    })
  }

  const handleRegister = async (msg: SnsMessage) => {
    if (!vesselId || !editedFields.date) return
    setRegistering(msg.id)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          date: editedFields.date,
          bin_type: 'day',
          name: editedFields.name || '未確認',
          tel: '',
          count: parseInt(editedFields.count) || 1,
          fishing_style: msg.ai_result?.fishing_style || null,
          channel: tab,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '登録に失敗しました')
        return
      }
      await supabase.from('sns_messages').update({ status: 'registered' }).eq('id', msg.id)
      setSnsMessages(prev => prev.filter(m => m.id !== msg.id))
      setExpandedId(null)
    } catch {
      alert('通信エラーが発生しました')
    } finally {
      setRegistering(null)
    }
  }

  const handleIgnore = async (msgId: string) => {
    await supabase.from('sns_messages').update({ status: 'ignored' }).eq('id', msgId)
    setSnsMessages(prev => prev.filter(m => m.id !== msgId))
    if (expandedId === msgId) setExpandedId(null)
  }

  const handleBatchRegister = async () => {
    if (!vesselId) return
    const targets = snsMessages.filter(m => m.ai_result?.is_booking && m.ai_result?.date && m.ai_result?.count)
    if (targets.length === 0) return

    setBatchRegistering(true)
    const registeredIds: string[] = []

    for (const msg of targets) {
      const ai = msg.ai_result!
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vessel_id: vesselId,
            date: ai.date,
            bin_type: 'day',
            name: ai.name || '未確認',
            tel: '',
            count: ai.count,
            fishing_style: ai.fishing_style || null,
            channel: tab,
          }),
        })
        if (res.ok) {
          await supabase.from('sns_messages').update({ status: 'registered' }).eq('id', msg.id)
          registeredIds.push(msg.id)
        }
      } catch {
        // 個別エラーは無視して次へ
      }
    }

    setSnsMessages(prev => prev.filter(m => !registeredIds.includes(m.id)))
    setExpandedId(null)
    setBatchRegistering(false)
  }

  const handleTelAnalyze = async () => {
    if (!telMessage.trim() || !vesselId) return
    setAnalyzing(true)
    setTelError('')
    setTelResult(null)
    setTelSaved(false)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: telMessage, vessel_id: vesselId, channel: 'tel' }),
      })
      const data = await res.json()
      if (!res.ok) { setTelError(data.error || '解析に失敗しました'); return }
      setTelResult(data)
      setTelEditedFields({
        name: data.extracted.name || '',
        date: data.extracted.date || '',
        count: data.extracted.count ? String(data.extracted.count) : '',
      })
    } catch {
      setTelError('通信エラーが発生しました')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleTelSave = async () => {
    if (!telResult || !vesselId || !telEditedFields.date) return
    setTelSaving(true)
    try {
      const binType = telResult.extracted.bin_preference === '夜' ? 'night' : 'day'
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          date: telEditedFields.date,
          bin_type: binType,
          name: telEditedFields.name || '未確認',
          tel: '',
          count: parseInt(telEditedFields.count) || 1,
          fishing_style: telResult.extracted.fishing_style || null,
          channel: 'tel',
        }),
      })
      if (res.ok) setTelSaved(true)
    } finally {
      setTelSaving(false)
    }
  }

  const unprocessedWithBooking = snsMessages.filter(m => m.ai_result?.is_booking)

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* ヘッダー */}
      <div style={{ background: 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', minHeight: '80px', overflow: 'hidden' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--surface)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--surface)', lineHeight: 1.2 }}>予約を取り込む</div>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>LINEやInstagramから届いた予約を確認して登録します</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* 3タブ */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--border)', borderRadius: '10px', padding: '3px', marginBottom: '12px' }}>
          {([
            { key: 'line' as const, label: 'LINE', icon: '💬' },
            { key: 'instagram' as const, label: 'Instagram', icon: '📸' },
            { key: 'tel' as const, label: '電話メモ', icon: '📞' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              style={{
                flex: 1, padding: '14px 8px', fontSize: '14px', fontWeight: 700,
                background: tab === t.key ? 'var(--surface)' : 'transparent',
                color: tab === t.key ? 'var(--ocean)' : 'var(--fg-3)',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>{t.icon}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* ===== LINE / Instagram タブ ===== */}
        {(tab === 'line' || tab === 'instagram') && (
          <>
            {unprocessedWithBooking.length >= 2 && (
              <button
                onClick={handleBatchRegister}
                disabled={batchRegistering}
                style={{
                  width: '100%', padding: '14px', marginBottom: '12px', fontSize: '18px', fontWeight: 700,
                  background: batchRegistering ? 'var(--border)' : 'var(--gold)',
                  color: batchRegistering ? 'var(--fg-3)' : 'var(--ocean)',
                  border: 'none', borderRadius: '10px', cursor: batchRegistering ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {batchRegistering ? '登録中...' : `まとめて取り込む（${unprocessedWithBooking.length}件）`}
              </button>
            )}

            {snsLoading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--fg-3)', fontSize: '14px' }}>
                読み込み中...
              </div>
            ) : snsMessages.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '2px dashed var(--border)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{tab === 'line' ? '💬' : '📸'}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '6px' }}>
                  新しいメッセージはありません
                </div>
                <div style={{ fontSize: '14px', color: 'var(--fg-3)', lineHeight: 1.6 }}>
                  {tab === 'line' ? 'LINE' : 'Instagram'}から予約メッセージが届くと<br />ここに表示されます
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {snsMessages.map(msg => {
                  const ai = msg.ai_result
                  const isExpanded = expandedId === msg.id

                  return (
                    <div
                      key={msg.id}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}
                    >
                      <div style={{ background: 'var(--bg)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{tab === 'line' ? '💬' : '📸'}</span>
                          <span style={{ fontSize: '14px', color: 'var(--fg-2)' }}>{formatRelativeTime(msg.received_at)}</span>
                        </div>
                        {ai?.is_booking ? (
                          <span style={{ fontSize: '14px', fontWeight: 700, background: 'var(--status-day-bg)', color: 'var(--ocean)', padding: '3px 8px', borderRadius: '99px' }}>
                            予約あり
                          </span>
                        ) : (
                          <span style={{ fontSize: '14px', fontWeight: 700, background: 'var(--status-closed-bg)', color: 'var(--fg-3)', padding: '3px 8px', borderRadius: '99px' }}>
                            予約外
                          </span>
                        )}
                      </div>

                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '18px', color: 'var(--fg-1)', background: 'var(--bg)', borderRadius: '8px', padding: '14px', marginBottom: '10px', lineHeight: 1.6 }}>
                          {msg.message_text}
                        </div>

                        {ai && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                            {[
                              { label: '名前', value: ai.name || '不明' },
                              { label: '日付', value: ai.date ? formatDate(ai.date) : '不明' },
                              { label: '人数', value: ai.count ? `${ai.count}名` : '不明' },
                              { label: '釣り物', value: ai.fishing_style || '未指定' },
                            ].map(({ label, value }) => (
                              <div key={label} style={{ background: 'var(--bg)', borderRadius: '6px', padding: '8px 10px' }}>
                                <div style={{ fontSize: '14px', color: 'var(--fg-3)', fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: ai.is_booking ? 'var(--fg-1)' : 'var(--fg-3)' }}>{value}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {isExpanded && (
                          <div style={{ background: 'var(--status-day-bg)', border: '1px solid var(--ocean-light)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '10px' }}>
                              内容を確認・修正してから登録してください
                            </div>
                            {[
                              {
                                label: '名前',
                                input: (
                                  <input
                                    type="text"
                                    value={editedFields.name}
                                    onChange={e => setEditedFields(p => ({ ...p, name: e.target.value }))}
                                    placeholder="未確認"
                                    style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--ocean-light)', borderRadius: '6px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                  />
                                ),
                              },
                              {
                                label: '日付',
                                input: (
                                  <input
                                    type="date"
                                    value={editedFields.date}
                                    onChange={e => setEditedFields(p => ({ ...p, date: e.target.value }))}
                                    style={{ width: '100%', padding: '14px', fontSize: '18px', border: '2px solid var(--ocean-light)', borderRadius: '6px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                  />
                                ),
                              },
                              {
                                label: '人数',
                                input: (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="number"
                                      min={1} max={20}
                                      value={editedFields.count}
                                      onChange={e => setEditedFields(p => ({ ...p, count: e.target.value }))}
                                      placeholder="1"
                                      style={{ width: '80px', padding: '14px', fontSize: '18px', border: '2px solid var(--ocean-light)', borderRadius: '6px', fontFamily: 'inherit', textAlign: 'center' }}
                                    />
                                    <span style={{ fontSize: '18px', color: 'var(--fg-1)' }}>名</span>
                                  </div>
                                ),
                              },
                            ].map(({ label, input }) => (
                              <div key={label} style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '4px' }}>{label}</div>
                                {input}
                              </div>
                            ))}
                            <button
                              onClick={() => handleRegister(msg)}
                              disabled={registering === msg.id || !editedFields.date}
                              style={{
                                width: '100%', padding: '14px', fontSize: '18px', fontWeight: 700,
                                background: registering === msg.id || !editedFields.date ? 'var(--border)' : 'var(--ocean)',
                                color: registering === msg.id || !editedFields.date ? 'var(--fg-3)' : 'var(--surface)',
                                border: 'none', borderRadius: '8px',
                                cursor: registering === msg.id || !editedFields.date ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              {registering === msg.id ? '登録中...' : '承認待ちに登録する →'}
                            </button>
                          </div>
                        )}

                        {!isExpanded && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleExpand(msg)}
                              style={{
                                flex: 1, padding: '16px', fontSize: '18px', fontWeight: 700,
                                background: 'var(--ocean-light)', color: 'var(--surface)', border: 'none', borderRadius: '8px',
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              取り込む
                            </button>
                            <button
                              onClick={() => handleIgnore(msg.id)}
                              style={{
                                flex: 1, padding: '16px', fontSize: '18px', fontWeight: 700,
                                background: 'var(--status-closed-bg)', color: 'var(--fg-2)', border: 'none', borderRadius: '8px',
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              無視する
                            </button>
                          </div>
                        )}
                        {isExpanded && (
                          <button
                            onClick={() => setExpandedId(null)}
                            style={{
                              width: '100%', padding: '16px', fontSize: '18px', fontWeight: 700,
                              background: 'transparent', color: 'var(--fg-2)',
                              border: '2px solid var(--border)', borderRadius: '8px',
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            キャンセル
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== 電話メモ タブ ===== */}
        {tab === 'tel' && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '8px' }}>
                電話でメモした内容を入力してください
              </div>
              <textarea
                value={telMessage}
                onChange={e => { setTelMessage(e.target.value); setTelResult(null); setTelSaved(false) }}
                placeholder={'電話でメモした内容を入力してください\n\n例：山田さん、5/3、2名、泳がせ希望'}
                style={{
                  width: '100%', padding: '16px', fontSize: '18px', lineHeight: 1.6,
                  border: '2px solid var(--border)', borderRadius: '8px', outline: 'none',
                  fontFamily: 'inherit', resize: 'none', height: '130px', boxSizing: 'border-box',
                }}
              />

              {telError && (
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-full-fg)', margin: '8px 0 0', lineHeight: 1.5 }}>
                  ⚠ {telError}
                </p>
              )}

              <button
                onClick={handleTelAnalyze}
                disabled={analyzing || !telMessage.trim()}
                style={{
                  width: '100%', padding: '16px', marginTop: '10px', fontSize: '18px', fontWeight: 700,
                  background: analyzing || !telMessage.trim() ? 'var(--border)' : 'var(--ocean)',
                  color: analyzing || !telMessage.trim() ? 'var(--fg-3)' : 'var(--surface)',
                  border: 'none', borderRadius: '10px',
                  cursor: analyzing || !telMessage.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {analyzing ? '読み取り中...' : '📞 電話メモを解析する →'}
              </button>
            </div>

            {telResult && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ background: 'var(--ocean)', padding: '12px 16px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--surface)', lineHeight: 1.2 }}>読み取り結果</div>
                </div>

                <div style={{ padding: '6px 14px' }}>
                  {[
                    {
                      label: '名前',
                      input: (
                        <input type="text" value={telEditedFields.name}
                          onChange={e => setTelEditedFields(p => ({ ...p, name: e.target.value }))}
                          placeholder="未確認"
                          style={{ fontSize: '18px', fontWeight: 700, border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', width: '160px', fontFamily: 'inherit' }}
                        />
                      ),
                    },
                    {
                      label: '日付',
                      input: (
                        <input type="date" value={telEditedFields.date}
                          onChange={e => setTelEditedFields(p => ({ ...p, date: e.target.value }))}
                          style={{ fontSize: '18px', fontWeight: 700, border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontFamily: 'inherit' }}
                        />
                      ),
                    },
                    {
                      label: '人数',
                      input: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input type="number" min={1} max={20} value={telEditedFields.count}
                            onChange={e => setTelEditedFields(p => ({ ...p, count: e.target.value }))}
                            placeholder="1"
                            style={{ fontSize: '18px', fontWeight: 700, border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px', width: '60px', fontFamily: 'inherit', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '18px', color: 'var(--fg-1)' }}>名</span>
                        </div>
                      ),
                    },
                  ].map(({ label, input }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--status-closed-bg)' }}>
                      <span style={{ fontSize: '18px', color: 'var(--fg-2)', fontWeight: 700 }}>{label}</span>
                      {input}
                    </div>
                  ))}

                  {[
                    { label: '釣り方', value: telResult.extracted.fishing_style },
                    { label: '便', value: telResult.extracted.bin_preference },
                    { label: '貸切', value: telResult.extracted.is_charter ? 'はい' : 'いいえ' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--status-closed-bg)' }}>
                      <span style={{ fontSize: '18px', color: 'var(--fg-2)', fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)' }}>{value ?? '未指定'}</span>
                    </div>
                  ))}

                  {telResult.extracted.date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--status-closed-bg)' }}>
                      <span style={{ fontSize: '18px', color: 'var(--fg-2)', fontWeight: 700 }}>空き状況</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: AVAILABILITY_STYLE[telResult.availability].bg, color: AVAILABILITY_STYLE[telResult.availability].color }}>
                        {AVAILABILITY_STYLE[telResult.availability].label}
                      </span>
                    </div>
                  )}
                </div>

                {telResult.extracted.missing_fields.length > 0 && (
                  <div style={{ padding: '12px 14px', background: 'var(--status-pending-bg)', borderTop: '1px solid var(--status-pending-dot)' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-pending-fg)', marginBottom: '4px' }}>以下は確認が必要です</div>
                    <div style={{ fontSize: '18px', color: 'var(--status-pending-fg)' }}>
                      {telResult.extracted.missing_fields.map(f => FIELD_LABELS[f] || f).join('、')}
                    </div>
                  </div>
                )}

                {telSaved ? (
                  <div style={{ padding: '16px', background: 'var(--status-ok-bg)', textAlign: 'center', borderTop: '1px solid var(--status-ok-bd)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-ok-fg)' }}>承認待ちに登録しました ✓</div>
                    <div style={{ fontSize: '14px', color: 'var(--status-ok-fg)', marginTop: '4px' }}>ダッシュボードから承認・お断りできます</div>
                  </div>
                ) : (
                  <div style={{ padding: '14px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={handleTelSave}
                      disabled={telSaving || !telEditedFields.date}
                      style={{
                        width: '100%', padding: '16px', fontSize: '18px', fontWeight: 700,
                        background: telSaving || !telEditedFields.date ? 'var(--border)' : 'var(--gold)',
                        color: telSaving || !telEditedFields.date ? 'var(--fg-3)' : 'var(--ocean)',
                        border: 'none', borderRadius: '10px',
                        cursor: telSaving || !telEditedFields.date ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {telSaving ? '登録中...' : '承認待ちに登録する　→'}
                    </button>
                    {!telEditedFields.date && (
                      <div style={{ fontSize: '14px', color: 'var(--status-full-fg)', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
                        日付が不明のため登録できません。内容を確認してから再度入力してください
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}



