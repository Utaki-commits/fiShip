'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type JsonObject = Record<string, unknown>

type Vessel = {
  id: string
  name: string
  captain_name: string
  logo_url: string
  banner_url: string
  facilities: JsonObject | null
}

type FacilityItem = {
  label: string
  enabled: boolean
  detail?: string
}

type FacilityCategory = {
  title: string
  items: FacilityItem[]
}

const valueLabel = (value: unknown) => {
  if (value === 'free') return '無料'
  if (value === 'paid') return '有料'
  if (value === 'sale') return '販売あり'
  if (value === 'none' || value == null || value === false || value === '') return 'なし'
  if (value === true) return 'あり'
  if (value === 'metal_halide') return 'メタルハライド'
  if (value === 'led') return 'LED'
  return String(value)
}

const enabledByValue = (value: unknown) => {
  if (value === true) return true
  if (typeof value === 'string') return value !== '' && value !== 'none'
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Boolean((value as JsonObject).enabled)
  return false
}

const buildCategories = (facilities: JsonObject): FacilityCategory[] => {
  const customFacilities = Array.isArray(facilities.custom_facilities)
    ? facilities.custom_facilities
        .map(item => typeof item === 'object' && item ? String((item as JsonObject).label || '') : '')
        .filter(Boolean)
    : []

  return [
    {
      title: '釣り道具',
      items: [
        { label: 'タックル貸出', enabled: enabledByValue(facilities.tackle_rental), detail: valueLabel(facilities.tackle_rental) },
        { label: 'ライフジャケット貸出', enabled: enabledByValue(facilities.life_jacket_rental) || facilities.life_jacket === true, detail: valueLabel(facilities.life_jacket_rental || facilities.life_jacket) },
        { label: 'ロッドホルダー', enabled: enabledByValue(facilities.rod_holder), detail: valueLabel(facilities.rod_holder) },
        { label: 'ロッドキーパー', enabled: enabledByValue(facilities.rod_keeper), detail: valueLabel(facilities.rod_keeper) },
      ],
    },
    {
      title: '設備',
      items: [
        { label: 'トイレ', enabled: enabledByValue(facilities.toilet), detail: valueLabel(facilities.toilet) },
        { label: 'クーラーボックス', enabled: enabledByValue(facilities.cooler), detail: valueLabel(facilities.cooler) },
        { label: '生け簀', enabled: enabledByValue(facilities.live_well), detail: valueLabel(facilities.live_well) },
        { label: '海水循環装置', enabled: enabledByValue(facilities.water_circulation), detail: valueLabel(facilities.water_circulation) },
        { label: '電動リール用電源', enabled: enabledByValue(facilities.electric_reel_power), detail: valueLabel(facilities.electric_reel_power) },
        { label: '集魚灯', enabled: enabledByValue(facilities.searchlight_type) || facilities.metal_light === true, detail: valueLabel(facilities.searchlight_type || facilities.metal_light) },
        { label: '電子レンジ', enabled: enabledByValue(facilities.microwave), detail: valueLabel(facilities.microwave) },
        { label: '湯沸かし器', enabled: enabledByValue(facilities.kettle), detail: valueLabel(facilities.kettle) },
        { label: '屋根日よけ', enabled: enabledByValue(facilities.roof), detail: valueLabel(facilities.roof) },
        { label: 'エアコン', enabled: enabledByValue(facilities.air_conditioner), detail: valueLabel(facilities.air_conditioner) },
        { label: '魚群探知機', enabled: enabledByValue(facilities.fish_finder), detail: valueLabel(facilities.fish_finder) },
      ],
    },
    {
      title: '魚の処理',
      items: [
        { label: '血抜き', enabled: enabledByValue(facilities.bloodletting), detail: valueLabel(facilities.bloodletting) },
        { label: '神経締め', enabled: enabledByValue(facilities.ike_jime), detail: valueLabel(facilities.ike_jime) },
        { label: '下処理', enabled: enabledByValue(facilities.cleaning), detail: valueLabel(facilities.cleaning) },
      ],
    },
    {
      title: '販売品',
      items: [
        { label: '氷', enabled: enabledByValue(facilities.ice), detail: valueLabel(facilities.ice) },
        { label: '餌', enabled: enabledByValue(facilities.bait), detail: valueLabel(facilities.bait) },
      ],
    },
    {
      title: '支払方法',
      items: [
        { label: '現金', enabled: facilities.cash !== false, detail: 'あり' },
        { label: 'クレジット', enabled: enabledByValue(facilities.credit), detail: valueLabel(facilities.credit) },
        { label: 'PayPay', enabled: enabledByValue(facilities.paypay), detail: valueLabel(facilities.paypay) },
        { label: 'その他', enabled: enabledByValue(facilities.payment), detail: valueLabel(facilities.payment) },
      ],
    },
    {
      title: 'こだわり設備',
      items: [
        { label: 'キャスティングデッキ', enabled: enabledByValue(facilities.casting_deck), detail: valueLabel(facilities.casting_deck) },
        { label: 'アンチローリングジャイロ', enabled: enabledByValue(facilities.gyro), detail: valueLabel(facilities.gyro) },
        { label: '探見丸', enabled: enabledByValue(facilities.tanken_maru), detail: valueLabel(facilities.tanken_maru) },
        ...customFacilities.map(label => ({ label, enabled: true, detail: 'あり' })),
      ],
    },
  ]
}

export default function FacilitiesPage() {
  const params = useParams()
  const router = useRouter()
  const vesselId = params.vesselId as string
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from('vessels')
        .select('id, name, captain_name, logo_url, banner_url, facilities')
        .eq('id', vesselId)
        .single()
      setVessel((data || null) as Vessel | null)
      setLoading(false)
    }
    init()
  }, [vesselId])

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#F4F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '18px', color: '#1A2420' }}>読み込み中...</div>
      </main>
    )
  }

  if (!vessel) {
    return (
      <main style={{ minHeight: '100vh', background: '#F4F6F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ fontSize: '18px', color: '#1A2420' }}>船の情報が見つかりません</div>
      </main>
    )
  }

  const categories = buildCategories(vessel.facilities || {})

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F4F6F2', fontFamily: 'var(--font-sans)', color: '#1A2420' }}>
      <header>
        <div style={{ position: 'relative', height: '140px', background: '#1B2A4A', overflow: 'hidden' }}>
          {vessel.banner_url && (
            <img src={vessel.banner_url} alt={`${vessel.name} バナー`} style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 16px', background: vessel.banner_url ? 'rgba(0,0,0,.5)' : 'transparent' }}>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#FFFFFF', lineHeight: 1.25 }}>{vessel.name}</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.86)', marginTop: '4px' }}>船長 {vessel.captain_name}</div>
          </div>
        </div>
      </header>

      <div style={{ padding: '12px 12px 0' }}>
        <button
          type="button"
          onClick={() => router.push(`/reserve/${vesselId}`)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '0.5px solid #CDD3DC', background: '#FFFFFF', color: '#1B2A4A', fontWeight: 500, fontFamily: 'inherit', textAlign: 'center' }}
        >
          ← 予約ページに戻る
        </button>
      </div>

      <main style={{ padding: '14px 12px 24px', display: 'grid', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>設備の詳細</h1>
        {categories.map(category => {
          const enabledItems = category.items.filter(item => item.enabled)
          const visible = enabledItems.length > 0
          if (!visible) return null

          return (
            <section key={category.title} style={{ background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '12px', padding: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>{category.title}</h2>
              <div style={{ display: 'grid', gap: '8px' }}>
                {enabledItems.map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #CDD3DC' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: '14px', color: '#1E4D3A', fontWeight: 500 }}>{item.detail || 'あり'}</span>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}

