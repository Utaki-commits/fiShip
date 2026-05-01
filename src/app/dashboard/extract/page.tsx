'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const SNS_CHANNELS = [
  { key: 'line', label: 'LINE' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'other', label: 'その他' },
]

const AVAILABILITY_STYLE = {
  open: { bg: '#E8F4FD', color: '#0A3D62', label: '空きあり' },
  full: { bg: '#FEE2E2', color: '#B91C1C', label: '満員' },
  charter: { bg: '#FEF9C3', color: '#854D0E', label: '貸切あり' },
}

const FIELD_LABELS: Record<string, string> = {
  name: '名前',
  date: '日付',
  count: '人数',
}

// 日付を表示用にフォーマット
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const dow = DAY_NAMES[d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日（${dow}）`
}

export default function ExtractPage() {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [tab, setTab] = useState<'sns' | 'phone'>('sns')
  const [channel, setChannel] = useState('line')
  const [message, setMessage] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // 解析結果から編集可能フィールドを保持する
  const [editedFields, setEditedFields] = useState({ name: '', date: '', count: '' })
  const router = useRouter()

  // ログイン確認と vessel_id 取得
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase
        .from('vessels')
        .select('id')
        .eq('user_id', session.user.id)
        .single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
    }
    init()
  }, [router])

  // タブ切り替え時にチャネルをリセット
  const handleTabChange = (newTab: 'sns' | 'phone') => {
    setTab(newTab)
    setChannel(newTab === 'phone' ? 'tel' : 'line')
    setResult(null)
    setSaved(false)
    setError('')
  }

  // メッセージ解析
  const handleAnalyze = async () => {
    if (!message.trim() || !vesselId) return
    setAnalyzing(true)
    setError('')
    setResult(null)
    setSaved(false)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, vessel_id: vesselId, channel }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '解析に失敗しました。もう一度お試しください。')
        return
      }
      setResult(data)
      // 編集フィールドを解析結果で初期化
      setEditedFields({
        name: data.extracted.name || '',
        date: data.extracted.date || '',
        count: data.extracted.count ? String(data.extracted.count) : '',
      })
    } catch {
      setError('通信エラーが発生しました。もう一度お試しください。')
    } finally {
      setAnalyzing(false)
    }
  }

  // 予約を承認待ちとして登録（editedFieldsの値を使用）
  const handleSave = async () => {
    if (!result || !vesselId || !editedFields.date) return
    setSaving(true)
    try {
      const binType = result.extracted.bin_preference === '夜' ? 'night' : 'day'
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel_id: vesselId,
          date: editedFields.date,
          bin_type: binType,
          name: editedFields.name || '未確認',
          tel: '',
          count: parseInt(editedFields.count) || 1,
          fishing_style: result.extracted.fishing_style || null,
          channel: result.extracted.is_charter ? 'charter' : channel,
        }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const currentChannels = tab === 'phone'
    ? [{ key: 'tel', label: '電話' }, { key: 'other', label: 'その他' }]
    : SNS_CHANNELS

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* ヘッダー */}
      <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>メッセージから予約を取り込む</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>SNS・電話メモを貼り付けて解析</div>
        </div>
      </div>

      <div style={{ padding: '12px' }}>

        {/* SNS / 電話メモ タブ */}
        <div style={{ display: 'flex', gap: '4px', background: '#E5E7EB', borderRadius: '10px', padding: '3px', marginBottom: '12px' }}>
          {([{ key: 'sns' as const, label: 'SNS・LINEメッセージ' }, { key: 'phone' as const, label: '電話メモ' }]).map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              style={{
                flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700,
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? '#0A3D62' : '#9CA3AF',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                transition: 'all .15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* チャネル選択 */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', marginBottom: '10px' }}>
            どこからの連絡ですか？
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {currentChannels.map(ch => (
              <button
                key={ch.key}
                onClick={() => setChannel(ch.key)}
                style={{
                  flex: 1, padding: '12px 8px', fontSize: '14px', fontWeight: 700,
                  background: channel === ch.key ? '#E8F4FD' : '#F8F9FA',
                  color: channel === ch.key ? '#0A3D62' : '#6B7280',
                  border: channel === ch.key ? '2px solid #2E86C1' : '2px solid transparent',
                  borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{ch.label}</button>
            ))}
          </div>
        </div>

        {/* メッセージ入力 */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', marginBottom: '8px' }}>
            {tab === 'sns'
              ? 'メッセージをそのまま貼り付けてください'
              : '電話でメモした内容を入力してください'}
          </div>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setResult(null); setSaved(false) }}
            placeholder={tab === 'sns'
              ? '例：来週の土曜に3人で行きたいです。一つテンヤお願いします'
              : '例：山田さん、5/3、2名、泳がせ希望'}
            style={{
              width: '100%', padding: '12px', fontSize: '14px', lineHeight: 1.6,
              border: '2px solid #E5E7EB', borderRadius: '8px', outline: 'none',
              fontFamily: 'inherit', resize: 'none', height: '120px',
            }}
          />

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px', marginTop: '8px', fontSize: '13px', color: '#B91C1C' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !message.trim()}
            style={{
              width: '100%', padding: '15px', marginTop: '10px', fontSize: '15px', fontWeight: 700,
              background: analyzing || !message.trim() ? '#E5E7EB' : '#0A3D62',
              color: analyzing || !message.trim() ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: '10px', cursor: analyzing || !message.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {analyzing ? '解析中...' : '予約情報を読み取る　→'}
          </button>
        </div>

        {/* 解析結果 */}
        {result && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ background: '#0A3D62', padding: '12px 16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>読み取り結果</div>
            </div>

            {/* 各項目の表示 */}
            <div style={{ padding: '6px 14px' }}>
              {/* 名前・日付・人数は編集可能入力フィールドで表示 */}
              {[
                {
                  label: '名前',
                  input: <input
                    type="text"
                    value={editedFields.name}
                    onChange={e => setEditedFields(p => ({ ...p, name: e.target.value }))}
                    placeholder="未確認"
                    style={{ fontSize: '14px', fontWeight: 700, border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 8px', width: '160px', fontFamily: 'inherit', color: editedFields.name ? '#111827' : '#D97706' }}
                  />,
                },
                {
                  label: '日付',
                  input: <input
                    type="date"
                    value={editedFields.date}
                    onChange={e => setEditedFields(p => ({ ...p, date: e.target.value }))}
                    style={{ fontSize: '14px', fontWeight: 700, border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 8px', fontFamily: 'inherit', color: editedFields.date ? '#111827' : '#D97706' }}
                  />,
                },
                {
                  label: '人数',
                  input: <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={editedFields.count}
                      onChange={e => setEditedFields(p => ({ ...p, count: e.target.value }))}
                      placeholder="1"
                      style={{ fontSize: '14px', fontWeight: 700, border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 8px', width: '60px', fontFamily: 'inherit', color: editedFields.count ? '#111827' : '#D97706' }}
                    />
                    <span style={{ fontSize: '13px', color: '#374151' }}>名</span>
                  </div>,
                },
              ].map(({ label, input }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 700 }}>{label}</span>
                  {input}
                </div>
              ))}

              {/* 固定表示項目（釣り方・便・貸切） */}
              {[
                { label: '釣り方', value: result.extracted.fishing_style, missing: false },
                { label: '便', value: result.extracted.bin_preference, missing: false },
                { label: '貸切', value: result.extracted.is_charter ? 'はい' : 'いいえ', missing: false },
              ].map(({ label, value, missing }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: missing ? '#D97706' : '#111827' }}>
                    {value ?? (missing ? '不明（要確認）' : '未指定')}
                  </span>
                </div>
              ))}

              {/* 空き状況（日付が判明している場合のみ） */}
              {result.extracted.date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 700 }}>空き状況</span>
                  <span style={{
                    fontSize: '13px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px',
                    background: AVAILABILITY_STYLE[result.availability].bg,
                    color: AVAILABILITY_STYLE[result.availability].color,
                  }}>
                    {AVAILABILITY_STYLE[result.availability].label}
                  </span>
                </div>
              )}
            </div>

            {/* 代替日提案（満員・貸切の場合） */}
            {result.altDates.length > 0 && (
              <div style={{ padding: '12px 14px', background: '#FEF9C3', borderTop: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#854D0E', marginBottom: '8px' }}>
                  代わりに空いている日
                </div>
                {result.altDates.map(alt => (
                  <div key={alt.date} style={{ fontSize: '13px', color: '#854D0E', padding: '4px 0' }}>
                    {formatDate(alt.date)}　残{alt.remaining}名
                  </div>
                ))}
              </div>
            )}

            {/* 不足項目の警告 */}
            {result.extracted.missing_fields.length > 0 && (
              <div style={{ padding: '12px 14px', background: '#FEF9C3', borderTop: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#854D0E', marginBottom: '4px' }}>
                  以下は確認が必要です
                </div>
                <div style={{ fontSize: '13px', color: '#854D0E' }}>
                  {result.extracted.missing_fields.map(f => FIELD_LABELS[f] || f).join('、')}
                </div>
              </div>
            )}

            {/* 登録ボタン */}
            {saved ? (
              <div style={{ padding: '16px', background: '#D4EDDA', textAlign: 'center', borderTop: '1px solid #86EFAC' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1B6B3A' }}>承認待ちに登録しました ✓</div>
                <div style={{ fontSize: '12px', color: '#1B6B3A', marginTop: '4px' }}>ダッシュボードから承認・お断りできます</div>
              </div>
            ) : (
              <div style={{ padding: '14px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !editedFields.date}
                  style={{
                    width: '100%', padding: '15px', fontSize: '15px', fontWeight: 700,
                    background: saving || !editedFields.date ? '#E5E7EB' : '#D4AC0D',
                    color: saving || !editedFields.date ? '#9CA3AF' : '#0A3D62',
                    border: 'none', borderRadius: '10px', cursor: saving || !editedFields.date ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? '登録中...' : '承認待ちに登録する　→'}
                </button>
                {!editedFields.date && (
                  <div style={{ fontSize: '12px', color: '#B91C1C', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
                    日付が不明のため登録できません。<br />内容を確認してから再度入力してください
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
