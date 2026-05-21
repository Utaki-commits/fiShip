'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Booking = {
  id: string
  date: string
  bin_type: string
  name: string
  tel: string
  count: number
  board_completed: boolean
  vessels: { id: string; name: string } | null
}

type Customer = {
  id: string
  address: string
  age: number | null
  gender: string | null
  emergency_contact: string
  emergency_contact_relation: string | null
}

type PageState = 'loading' | 'invalid' | 'expired' | 'completed' | 'form' | 'confirm' | 'done'

const RELATION_OPTIONS = ['配偶者', '親', '子', '兄弟・姉妹', '友人', 'その他']

const BIN_LABELS: Record<string, string> = { day: '昼便', night: '夜便', relay: '昼夜便' }

export default function BoardPage() {
  const { token } = useParams<{ token: string }>()

  const [state, setState] = useState<PageState>('loading')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [address, setAddress] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [emergency, setEmergency] = useState('')
  const [relation, setRelation] = useState('')

  useEffect(() => {
    fetch(`/api/board/${token}`)
      .then(r => r.json())
      .then(res => {
        if (res.error === 'invalid_token') { setState('invalid'); return }
        if (res.error === 'expired') { setState('expired'); return }
        if (res.booking?.board_completed) { setState('completed'); return }

        setBooking(res.booking)
        if (res.existingCustomer) {
          const c: Customer = res.existingCustomer
          setExistingCustomer(c)
          setAddress(c.address ?? '')
          setAge(c.age != null ? String(c.age) : '')
          setGender(c.gender ?? '')
          setEmergency(c.emergency_contact ?? '')
          setRelation(c.emergency_contact_relation ?? '')
          setState('confirm')
        } else {
          setState('form')
        }
      })
      .catch(() => setState('invalid'))
  }, [token])

  const handleSubmit = async () => {
    if (!address || !age || !emergency) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/board/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, age: Number(age), gender, emergency_contact: emergency, emergency_contact_relation: relation }),
      })
      if (res.ok) {
        setState('done')
      } else {
        alert('送信に失敗しました。もう一度お試しください。')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const headerStyle: React.CSSProperties = {
    background: '#7F1D1D',
    padding: '20px 20px 24px',
    color: '#fff',
  }

  const wrapStyle: React.CSSProperties = {
    maxWidth: '480px',
    margin: '0 auto',
    minHeight: '100vh',
    background: 'var(--bg, #f8f8f8)',
    fontFamily: 'var(--font-sans, sans-serif)',
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '0.5px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#555',
    marginBottom: '6px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '0.5px solid #ccc',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#222',
  }

  const btnPrimaryStyle: React.CSSProperties = {
    width: '100%',
    padding: '18px',
    background: '#7F1D1D',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: 500,
    cursor: submitting ? 'not-allowed' : 'pointer',
    opacity: submitting ? 0.6 : 1,
  }

  const formatDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return `${dt.getMonth() + 1}月${dt.getDate()}日`
  }

  // ─── 状態ごとの表示 ───

  if (state === 'loading') {
    return (
      <div style={{ ...wrapStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: '15px' }}>読み込み中...</p>
      </div>
    )
  }

  if (state === 'invalid' || state === 'expired') {
    return (
      <div style={wrapStyle}>
        <div style={headerStyle}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>乗船名簿</p>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 500, color: '#333', marginBottom: '12px' }}>
            {state === 'expired' ? 'リンクの有効期限が切れています' : 'このリンクは無効です'}
          </p>
          <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.7 }}>
            船長にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  if (state === 'completed') {
    return (
      <div style={wrapStyle}>
        <div style={headerStyle}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>乗船名簿</p>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '36px', marginBottom: '16px' }}>✓</p>
          <p style={{ fontSize: '18px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
            登録済みです
          </p>
          <p style={{ fontSize: '15px', color: '#888' }}>
            乗船名簿の記入は完了しています。
          </p>
        </div>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div style={wrapStyle}>
        <div style={headerStyle}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>
            {booking?.vessels?.name ?? ''}
          </p>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', marginBottom: '16px' }}>✓</p>
          <p style={{ fontSize: '20px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
            登録が完了しました
          </p>
          <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.7 }}>
            当日は安全な釣行をお楽しみください。
          </p>
        </div>
      </div>
    )
  }

  const binLabel = booking ? (BIN_LABELS[booking.bin_type] ?? booking.bin_type) : ''

  // ─── 確認モード（2回目以降） ───
  if (state === 'confirm' && !editMode) {
    return (
      <div style={wrapStyle}>
        <div style={headerStyle}>
          <p style={{ fontSize: '18px', fontWeight: 500 }}>
            {booking?.vessels?.name ?? ''}
          </p>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '6px', fontWeight: 500 }}>
              乗船確認
            </p>
            <p style={{ fontSize: '17px', fontWeight: 500, color: '#222', marginBottom: '4px' }}>
              {booking ? formatDate(booking.date) : ''} {binLabel}
            </p>
            <p style={{ fontSize: '15px', color: '#444' }}>
              {booking?.name} 様 {booking?.count}名
            </p>
          </div>

          <div style={cardStyle}>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '14px', fontWeight: 500 }}>
              以下の情報をご確認ください
            </p>

            {[
              { label: '住所', value: address, key: 'address' },
              { label: '年齢', value: age ? `${age}歳` : '—', key: 'age' },
              { label: '性別', value: gender === 'male' ? '男性' : gender === 'female' ? '女性' : gender === 'other' ? 'その他' : '—', key: 'gender' },
              { label: '緊急連絡先', value: emergency, key: 'emergency' },
            ].map(row => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #eee' }}>
                <span style={{ fontSize: '14px', color: '#888', minWidth: '100px' }}>{row.label}</span>
                <span style={{ fontSize: '15px', color: '#222', flex: 1, textAlign: 'left', margin: '0 8px' }}>{row.value}</span>
                {['address', 'age', 'emergency'].includes(row.key) && (
                  <button
                    onClick={() => setEditMode(true)}
                    style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: '6px', padding: '4px 10px', fontSize: '13px', color: '#555', cursor: 'pointer' }}
                  >
                    変更する
                  </button>
                )}
              </div>
            ))}
          </div>

          <SafetyAgreement />

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={btnPrimaryStyle}
          >
            {submitting ? '送信中...' : '確認して同意する'}
          </button>
        </div>
      </div>
    )
  }

  // ─── 入力フォーム（初回 or 変更モード） ───
  const canSubmit = address.trim() && age.trim() && emergency.trim()

  return (
    <div style={wrapStyle}>
      <div style={headerStyle}>
        <p style={{ fontSize: '18px', fontWeight: 500 }}>
          {booking?.vessels?.name ?? ''}
        </p>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={cardStyle}>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '6px', fontWeight: 500 }}>
            乗船確認
          </p>
          <p style={{ fontSize: '17px', fontWeight: 500, color: '#222', marginBottom: '4px' }}>
            {booking ? formatDate(booking.date) : ''} {binLabel}
          </p>
          <p style={{ fontSize: '15px', color: '#444' }}>
            {booking?.name} 様 {booking?.count}名
          </p>
        </div>

        <div style={cardStyle}>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px', fontWeight: 500 }}>
            以下の情報をご入力ください
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>住所 <span style={{ color: '#c00' }}>*</span></label>
            <input
              style={inputStyle}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="〇〇県〇〇市〇〇町..."
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>年齢 <span style={{ color: '#c00' }}>*</span></label>
            <input
              style={inputStyle}
              type="number"
              inputMode="numeric"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="45"
              min={0}
              max={120}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>性別 <span style={{ color: '#c00' }}>*</span></label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[{ value: 'male', label: '男性' }, { value: 'female', label: '女性' }, { value: 'other', label: 'その他' }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  style={{
                    flex: 1,
                    padding: '14px 8px',
                    border: `0.5px solid ${gender === opt.value ? '#7F1D1D' : '#ccc'}`,
                    borderRadius: '8px',
                    background: gender === opt.value ? '#7F1D1D' : '#fff',
                    color: gender === opt.value ? '#fff' : '#444',
                    fontSize: '15px',
                    fontWeight: gender === opt.value ? 500 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>緊急連絡先（電話番号） <span style={{ color: '#c00' }}>*</span></label>
            <input
              style={inputStyle}
              type="tel"
              inputMode="tel"
              value={emergency}
              onChange={e => setEmergency(e.target.value)}
              placeholder="090-0000-0000"
            />
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label style={labelStyle}>続柄（任意）</label>
            <select
              style={{ ...inputStyle, appearance: 'auto' }}
              value={relation}
              onChange={e => setRelation(e.target.value)}
            >
              <option value="">選択してください</option>
              {RELATION_OPTIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <SafetyAgreement />

        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          style={{ ...btnPrimaryStyle, opacity: (submitting || !canSubmit) ? 0.5 : 1 }}
        >
          {submitting ? '送信中...' : '上記に同意して登録する'}
        </button>
      </div>
    </div>
  )
}

function SafetyAgreement() {
  const items = [
    'ライフジャケットを必ず着用してください',
    '船長の指示に従ってください',
    '採捕制限を守ってください',
    '体調不良の場合は申し出てください',
  ]
  return (
    <div style={{ border: '0.5px solid #e0e0e0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', background: '#fafafa' }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#555', marginBottom: '12px' }}>
        安全のお約束
      </p>
      {items.map(item => (
        <p key={item} style={{ fontSize: '14px', color: '#555', padding: '6px 0', borderBottom: '0.5px solid #eee', lineHeight: 1.6 }}>
          ・{item}
        </p>
      ))}
    </div>
  )
}
