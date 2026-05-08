'use client'
import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Facilities = {
  tackle_rental: 'free' | 'paid' | 'none'  // タックル貸出（無料/有料/なし）
  bait: boolean                              // 餌
  ice: 'sale' | 'free' | 'none'            // 氷（販売/無料/なし）
  life_jacket: boolean                       // ライフジャケット
  rod_holder: boolean                        // ロッドホルダー
  metal_light: boolean                       // 夜焚き用メタハラ集魚灯
  toilet: boolean                            // トイレ
  cooler: boolean                            // クーラーボックス
  live_well: boolean                         // 生け簀
  water_circulation: boolean                 // 海水循環装置
  microwave: boolean                         // 電子レンジ
  kettle: boolean                            // 湯沸かし器
  roof: boolean                              // 屋根日よけ
  casting_deck: boolean                      // キャスティングデッキ
  gyro: boolean                              // アンチローリングジャイロ
  rod_keeper: boolean                        // ロッドキーパー
  bloodletting: boolean                      // 血抜き
  ike_jime: boolean                          // 神経締め
  cleaning: 'free' | 'paid' | 'none'       // 下処理（無料/有料/なし）
  parking: 'free' | 'paid' | 'none'        // 駐車場（無料/有料/なし）
  cash: boolean                             // 現金
  credit: boolean                           // クレジット
  paypay: boolean                           // PayPay
  payment: string                           // その他・備考
}

type FacilityDisplayItem = {
  label: string
  value: (facilities: Facilities) => string
}

type FacilityDisplayCategory = {
  title: string
  items: FacilityDisplayItem[]
}

const defaultFacilities = (): Facilities => ({
  tackle_rental: 'none',
  bait: false,
  ice: 'none',
  life_jacket: false,
  rod_holder: false,
  metal_light: false,
  toilet: false,
  cooler: false,
  live_well: false,
  water_circulation: false,
  microwave: false,
  kettle: false,
  roof: false,
  casting_deck: false,
  gyro: false,
  rod_keeper: false,
  bloodletting: false,
  ike_jime: false,
  cleaning: 'none',
  parking: 'none',
  cash: true,
  credit: false,
  paypay: false,
  payment: '',
})

const availabilityLabel = (value: boolean) => value ? 'あり' : 'なし'

const choiceLabel = (value: string, labels: Record<string, string>) => labels[value] ?? 'なし'

const parkingLabel = (value: Facilities['parking']) => choiceLabel(value, { free: 'あり', paid: '有料', none: 'なし' })

const facilityDisplayCategories: FacilityDisplayCategory[] = [
  {
    title: '釣り道具',
    items: [
      { label: 'タックル貸出', value: facilities => choiceLabel(facilities.tackle_rental, { free: '無料', paid: '有料', none: 'なし' }) },
      { label: 'ライフジャケット', value: facilities => availabilityLabel(facilities.life_jacket) },
      { label: 'ロッドホルダー', value: facilities => availabilityLabel(facilities.rod_holder) },
    ],
  },
  {
    title: '船内設備',
    items: [
      { label: 'トイレ', value: facilities => availabilityLabel(facilities.toilet) },
      { label: 'クーラーボックス', value: facilities => availabilityLabel(facilities.cooler) },
      { label: '生け簀', value: facilities => availabilityLabel(facilities.live_well) },
      { label: '海水循環装置', value: facilities => availabilityLabel(facilities.water_circulation) },
      { label: '電子レンジ', value: facilities => availabilityLabel(facilities.microwave) },
      { label: '湯沸かし器', value: facilities => availabilityLabel(facilities.kettle) },
      { label: '屋根日よけ', value: facilities => availabilityLabel(facilities.roof) },
      { label: '夜焚き用集魚灯', value: facilities => availabilityLabel(facilities.metal_light) },
    ],
  },
  {
    title: '魚の処理',
    items: [
      { label: '血抜き', value: facilities => availabilityLabel(facilities.bloodletting) },
      { label: '神経締め', value: facilities => availabilityLabel(facilities.ike_jime) },
      { label: '下処理', value: facilities => choiceLabel(facilities.cleaning, { free: '無料', paid: '有料', none: 'なし' }) },
    ],
  },
  {
    title: '販売品',
    items: [
      { label: '氷', value: facilities => choiceLabel(facilities.ice, { sale: '販売', free: '無料', none: 'なし' }) },
      { label: '餌', value: facilities => availabilityLabel(facilities.bait) },
    ],
  },
  {
    title: '支払方法',
    items: [
      { label: '現金', value: facilities => availabilityLabel(facilities.cash) },
      { label: 'クレジット', value: facilities => availabilityLabel(facilities.credit) },
      { label: 'PayPay', value: facilities => availabilityLabel(facilities.paypay) },
      { label: 'その他・備考', value: facilities => facilities.payment.trim() || 'なし' },
    ],
  },
  {
    title: 'こだわり設備',
    items: [
      { label: 'キャスティングデッキ', value: facilities => availabilityLabel(facilities.casting_deck) },
      { label: 'アンチローリングジャイロ', value: facilities => availabilityLabel(facilities.gyro) },
      { label: 'ロッドキーパー', value: facilities => availabilityLabel(facilities.rod_keeper) },
    ],
  },
]

type Vessel = {
  id: string
  name: string
  captain_name: string
  capacity: number
  prefecture: string
  port_name: string
  access: string
  departure_time: string
  charter_accepted: boolean
  beginner_accepted: boolean
  price: string
  facilities?: Facilities | null
  max_bookings_per_customer: number
}

type View = 'top' | 'edit'

export default function VesselPage() {
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('top')
  const [form, setForm] = useState<Omit<Vessel, 'id'> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: v } = await supabase
        .from('vessels').select('*').eq('user_id', session.user.id).single()
      if (!v) { router.push('/register'); return }
      setVessel(v)
      setLoading(false)
    }
    init()
  }, [router])

  // 編集開始：フォームに現在値をセット（現金は常にON）
  const startEdit = () => {
    if (!vessel) return
    const currentFacilities = vessel.facilities || defaultFacilities()
    setForm({ ...vessel, facilities: { ...currentFacilities, cash: true }, max_bookings_per_customer: vessel.max_bookings_per_customer ?? 5 })
    setError('')
    setSaved(false)
    setView('edit')
  }

  const update = (key: keyof Omit<Vessel, 'id'>, val: unknown) => {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  // 変更を保存する
  const handleSave = async () => {
    if (!form || !vessel) return
    if (!form.name.trim() || !form.captain_name.trim()) {
      setError('船の名前と船長名を入力してください')
      return
    }
    if (!form.prefecture.trim() || !form.port_name.trim()) {
      setError('都道府県と出船場所を入力してください')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('vessels')
        .update({
          name: form.name,
          captain_name: form.captain_name,
          capacity: form.capacity,
          prefecture: form.prefecture,
          port_name: form.port_name,
          access: form.access,
          departure_time: form.departure_time,
          charter_accepted: form.charter_accepted,
          beginner_accepted: form.beginner_accepted,
          price: form.price,
          facilities: form.facilities || defaultFacilities(),
          max_bookings_per_customer: form.max_bookings_per_customer ?? 5,
        })
        .eq('id', vessel.id)
      if (err) { setError('保存に失敗しました。もう一度お試しください。'); return }
      setVessel({ ...vessel, ...form })
      setSaved(true)
      setView('top')
    } finally {
      setSaving(false)
    }
  }

  // QRコード画像をPNGとしてダウンロードする
  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // SVGのサイズに余白を加えたcanvasサイズ
    const size = 184
    canvas.width = size
    canvas.height = size

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 12, 12, 160, 160)
      const a = document.createElement('a')
      a.download = '予約QRコード.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // URLをクリップボードにコピーする
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボードAPIが使えないブラウザ向け fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A3D62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  if (!vessel) return null

  // 本番URLを優先し、未設定時はブラウザのoriginを使用
  const reserveUrl = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/reserve/${vessel.id}`
  const facilities: Facilities = vessel.facilities || defaultFacilities()

  const updateFacility = (key: keyof Facilities, val: boolean | string) => {
    setForm(f => f ? { ...f, facilities: { ...(f.facilities || defaultFacilities()), [key]: val } } : f)
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* ヘッダー */}
      <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <button
          onClick={() => view === 'edit' ? setView('top') : router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            {view === 'top' ? '船の情報・予約リンク' : '船の情報を変更する'}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            {view === 'top' ? vessel.name : '変更内容を入力して保存してください'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px' }}>

        {/* ===== 確認ビュー ===== */}
        {view === 'top' && (
          <>
            {/* 保存完了バナー */}
            {saved && (
              <div style={{ background: '#D4EDDA', border: '1px solid #86EFAC', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', fontSize: '16px', fontWeight: 700, color: '#1B6B3A', textAlign: 'center' }}>
                変更を保存しました ✓
              </div>
            )}

            {/* 予約URL カード */}
            <div style={{ background: '#fff', border: '2px solid #2E86C1', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0A3D62', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>🔗</span> お客さんへの予約リンク
              </div>

              {/* QRコード */}
              <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'inline-block' }}>
                  <QRCodeSVG value={reserveUrl} size={160} />
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', marginBottom: '10px', lineHeight: 1.5 }}>
                このQRコードをLINEやインスタで送ると<br />お客さんがすぐに予約できます
              </div>

              {/* QRコード保存ボタン */}
              <button
                onClick={handleDownloadQR}
                style={{
                  width: '100%', padding: '12px', marginBottom: '12px', fontSize: '16px', fontWeight: 700,
                  background: '#F8F9FA', color: '#374151',
                  border: '2px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                QRコードを保存する
              </button>

              {/* URL表示 */}
              <div style={{ background: '#F8F9FA', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', wordBreak: 'break-all', fontSize: '14px', color: '#374151' }}>
                {reserveUrl}
              </div>

              {/* コピーボタン */}
              <button
                onClick={() => handleCopy(reserveUrl)}
                style={{
                  width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700,
                  background: copied ? '#D4EDDA' : '#0A3D62',
                  color: copied ? '#1B6B3A' : '#fff',
                  border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background .2s',
                }}
              >
                {copied ? 'コピーしました ✓' : 'URLをコピーする'}
              </button>
            </div>

            {/* 船の情報カード */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ background: '#F8F9FA', padding: '10px 16px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>現在の船の情報</div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {[
                  { label: '船の名前', value: vessel.name },
                  { label: '船長名', value: vessel.captain_name },
                  { label: '出船場所', value: `${vessel.prefecture}・${vessel.port_name}` },
                  { label: 'アクセス', value: vessel.access || '未設定' },
                  { label: '駐車場', value: parkingLabel(facilities.parking) },
                  { label: '乗船料金', value: vessel.price || '未設定' },
                  { label: '定員', value: `${vessel.capacity}名` },
                  { label: '初心者歓迎', value: vessel.beginner_accepted ? 'はい' : 'いいえ' },
                  { label: '貸切OK', value: vessel.charter_accepted ? 'はい' : 'いいえ' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: '16px', color: '#6B7280', fontWeight: 700, flexShrink: 0, marginRight: '12px' }}>{label}</span>
                    <span style={{ fontSize: '16px', color: '#111827', fontWeight: 600, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 設備・サービスカード */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ background: '#F8F9FA', padding: '10px 16px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>設備・サービス</div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {facilityDisplayCategories.flatMap(category => [
                  <div key={category.title} style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF', padding: '10px 16px 4px', background: '#F8F9FA', borderBottom: '1px solid #F3F4F6' }}>
                    {category.title}
                  </div>,
                  ...category.items.map(item => (
                    <div key={`${category.title}-${item.label}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid #F3F4F6' }}>
                      <span style={{ fontSize: '16px', color: '#6B7280', fontWeight: 700 }}>{item.label}</span>
                      <span style={{ fontSize: '16px', color: '#111827', fontWeight: 600, textAlign: 'right' }}>{item.value(facilities)}</span>
                    </div>
                  )),
                ])}
              </div>
            </div>

            {/* 変更ボタン */}
            <button
              onClick={startEdit}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700,
                background: '#fff', color: '#0A3D62', border: '2px solid #0A3D62',
                borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✏️　船の情報を変更する
            </button>
          </>
        )}

        {/* ===== 編集ビュー ===== */}
        {view === 'edit' && form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#B91C1C' }}>
                {error}
              </div>
            )}

            {/* 基本情報 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>基本情報</div>

              <label style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                船の名前 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '11px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                value={form.name}
                onChange={e => update('name', e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' }}
                placeholder="例：海皇丸"
              />

              <label style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                船長名 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '11px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </label>
              <input
                value={form.captain_name}
                onChange={e => update('captain_name', e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '0', boxSizing: 'border-box' }}
                placeholder="例：山田 太郎"
              />
            </div>

            {/* 定員 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>最大乗船人数</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {[4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => update('capacity', n)}
                    style={{
                      padding: '14px 8px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '16px', fontWeight: 700,
                      background: form.capacity === n ? '#E8F4FD' : '#F8F9FA',
                      color: form.capacity === n ? '#0A3D62' : '#9CA3AF',
                      border: form.capacity === n ? '2px solid #2E86C1' : '2px solid transparent',
                    }}
                  >{n}名</button>
                ))}
              </div>
            </div>

            {/* 出船場所 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>出船場所</div>

              <label style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>都道府県</label>
              <input
                value={form.prefecture}
                onChange={e => update('prefecture', e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' }}
                placeholder="例：福岡県"
              />

              <label style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>漁港・出船場所</label>
              <input
                value={form.port_name}
                onChange={e => update('port_name', e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' }}
                placeholder="例：糸島市志摩野北漁港"
              />

              <label style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                アクセスのメモ <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 400 }}>（任意）</span>
              </label>
              <input
                value={form.access}
                onChange={e => update('access', e.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' }}
                placeholder="例：筑前前原駅から車で15分"
              />

              <div style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', marginBottom: '6px' }}>駐車場</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { value: 'free', label: 'あり' },
                  { value: 'none', label: 'なし' },
                  { value: 'paid', label: '有料' },
                ].map(option => {
                  const currentParking = (form.facilities || defaultFacilities()).parking
                  return (
                    <button
                      key={option.value}
                      onClick={() => updateFacility('parking', option.value)}
                      style={{
                        flex: 1, padding: '12px 4px', borderRadius: '8px', fontSize: '16px', fontWeight: 700,
                        background: currentParking === option.value ? '#E8F4FD' : '#F8F9FA',
                        color: currentParking === option.value ? '#0A3D62' : '#9CA3AF',
                        border: currentParking === option.value ? '2px solid #2E86C1' : '2px solid transparent',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 乗船料金（釣り物別に設定可） */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <label style={{ fontSize: '16px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                乗船料金 <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 400 }}>（任意・釣り物別に改行で入力可）</span>
              </label>
              <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>例：タイラバ 15,000円　イカメタル 12,000円</div>
              <textarea
                value={form.price}
                onChange={e => update('price', e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none', lineHeight: 1.6 }}
                placeholder={'例：\nタイラバ　15,000円\nイカメタル　12,000円\n（エサ・氷代込み）'}
              />
            </div>

            {/* 設備・サービス */}
            {(() => {
              const fac = form?.facilities || defaultFacilities()
              const threeChoice = (key: 'tackle_rental' | 'ice' | 'cleaning', label: string, opts: readonly { v: string; l: string }[]) => {
                const cur = (fac as Record<string, unknown>)[key] as string
                return (
                  <div key={key} style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', marginBottom: '6px' }}>{label}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {opts.map(o => (
                        <button key={o.v} onClick={() => updateFacility(key, o.v)} style={{ flex: 1, padding: '10px 4px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, background: cur === o.v ? '#E8F4FD' : '#F8F9FA', color: cur === o.v ? '#0A3D62' : '#9CA3AF', border: cur === o.v ? '2px solid #2E86C1' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                )
              }
              const toggle = (key: keyof Facilities, label: string) => {
                const val = (fac as Record<string, unknown>)[key] as boolean
                return (
                  <div key={key} onClick={() => updateFacility(key, !val)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', marginBottom: '6px', background: val ? '#E8F4FD' : '#F8F9FA', border: val ? '2px solid #2E86C1' : '2px solid transparent' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{label}</span>
                    <div style={{ width: '46px', height: '26px', borderRadius: '13px', background: val ? '#2E86C1' : '#E5E7EB', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                      <div style={{ position: 'absolute', top: '3px', left: val ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
                    </div>
                  </div>
                )
              }
              const catHeader = (label: string) => (
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#9CA3AF', marginTop: '14px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #F3F4F6' }}>{label}</div>
              )
              return (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>設備・サービス</div>

                  {catHeader('釣り道具')}
                  {threeChoice('tackle_rental', 'タックル貸出', [{ v: 'free', l: '無料' }, { v: 'paid', l: '有料' }, { v: 'none', l: 'なし' }])}
                  {toggle('life_jacket', 'ライフジャケット')}
                  {toggle('rod_holder', 'ロッドホルダー')}

                  {catHeader('船内設備')}
                  {toggle('toilet', 'トイレ')}
                  {toggle('cooler', 'クーラーボックス')}
                  {toggle('live_well', '生け簀')}
                  {toggle('water_circulation', '海水循環装置')}
                  {toggle('microwave', '電子レンジ')}
                  {toggle('kettle', '湯沸かし器')}
                  {toggle('roof', '屋根日よけ')}
                  {toggle('metal_light', '夜焚き用メタハラ集魚灯')}

                  {catHeader('魚の処理')}
                  {toggle('bloodletting', '血抜き')}
                  {toggle('ike_jime', '神経締め')}
                  {threeChoice('cleaning', '下処理', [{ v: 'free', l: '無料' }, { v: 'paid', l: '有料' }, { v: 'none', l: 'なし' }])}

                  {catHeader('販売品')}
                  {threeChoice('ice', '氷', [{ v: 'sale', l: '販売' }, { v: 'free', l: '無料' }, { v: 'none', l: 'なし' }])}
                  {toggle('bait', '餌')}

                  {catHeader('支払方法')}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button disabled style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, background: '#E8F4FD', color: '#0A3D62', border: '2px solid #2E86C1', cursor: 'not-allowed', fontFamily: 'inherit' }}>現金</button>
                      {([{ key: 'credit' as const, label: 'クレジット' }, { key: 'paypay' as const, label: 'PayPay' }]).map(({ key, label }) => {
                        const val = (fac as Record<string, unknown>)[key] as boolean
                        return (
                          <button key={key} onClick={() => updateFacility(key, !val)} style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, background: val ? '#E8F4FD' : '#F8F9FA', color: val ? '#0A3D62' : '#9CA3AF', border: val ? '2px solid #2E86C1' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                        )
                      })}
                    </div>
                  </div>
                  <label style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '6px' }}>
                    その他・備考 <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 400 }}>（任意）</span>
                  </label>
                  <input value={fac.payment} onChange={e => updateFacility('payment', e.target.value)} style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="例：ポイント支払い可" />

                  {catHeader('こだわり設備')}
                  {toggle('casting_deck', 'キャスティングデッキ')}
                  {toggle('gyro', 'アンチローリングジャイロ')}
                  {toggle('rod_keeper', 'ロッドキーパー')}
                </div>
              )
            })()}

            {/* お客さん一人あたりの最大予約件数 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>お客さん一人あたりの最大予約件数</div>
              <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '10px' }}>同じ電話番号で受け付ける予約の上限です</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  value={form.max_bookings_per_customer ?? 5}
                  onChange={e => update('max_bookings_per_customer', Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  min={1}
                  max={99}
                  style={{ flex: 1, padding: '12px', fontSize: '24px', fontWeight: 700, border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', color: '#111827', textAlign: 'center' }}
                />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>件まで</span>
              </div>
            </div>

            {/* オプション */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>予約ページの表示設定</div>

              {([
                { key: 'beginner_accepted' as const, label: '初心者歓迎', sub: '予約ページに「初心者歓迎」と表示されます' },
                { key: 'charter_accepted' as const, label: '貸切（チャーター）OK', sub: '貸切予約も受け付けます' },
              ] as const).map(({ key, label, sub }) => (
                <div
                  key={key}
                  onClick={() => update(key, !form[key])}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px', borderRadius: '10px', cursor: 'pointer', marginBottom: '8px',
                    background: form[key] ? '#E8F4FD' : '#F8F9FA',
                    border: form[key] ? '2px solid #2E86C1' : '2px solid transparent',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{label}</div>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '2px' }}>{sub}</div>
                  </div>
                  <div style={{ width: '46px', height: '26px', borderRadius: '13px', background: form[key] ? '#2E86C1' : '#E5E7EB', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                    <div style={{ position: 'absolute', top: '3px', left: form[key] ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .2s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* 保存ボタン */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700,
                background: saving ? '#E5E7EB' : '#0A3D62',
                color: saving ? '#9CA3AF' : '#fff',
                border: 'none', borderRadius: '12px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {saving ? '保存中...' : '変更を保存する'}
            </button>

            <button
              onClick={() => setView('top')}
              style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700, background: 'transparent', color: '#6B7280', border: '2px solid #E5E7EB', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              キャンセル
            </button>

          </div>
        )}

      </div>
    </div>
  )
}
