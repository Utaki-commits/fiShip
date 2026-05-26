'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, inputStyle } from '../_components/CaptainShell'

type Facilities = {
  parking?: 'free' | 'paid' | 'coin' | 'none'
  parking_price?: string
  electric_reel_power?: boolean
  air_conditioner?: boolean
  fish_finder?: { enabled: boolean; makers: string[] }
  searchlight_type?: 'metal_halide' | 'led' | 'none'
  life_jacket_rental?: 'free' | 'paid' | 'none'
  life_jacket_rental_price?: string
  rod_keeper?: boolean
  tanken_maru?: boolean
  custom_facilities?: { label: string }[]
  [key: string]: unknown
}
type Vessel = {
  id: string
  name: string
  captain_name: string
  capacity: number | null
  prefecture: string | null
  port_name: string | null
  access: string | null
  departure_time: string | null
  charter_accepted: boolean
  beginner_accepted: boolean
  price: string | null
  logo_url: string | null
  banner_url: string | null
  map_embed_url: string | null
  facilities: Facilities | null
  max_bookings_per_customer: number | null
}
type VesselPhoto = { id: string; url: string; caption: string | null; sort_order: number | null }

const defaultFacilities = (value?: Facilities | null): Facilities => ({
  parking: value?.parking === 'paid' || value?.parking === 'free' || value?.parking === 'coin' ? value.parking : 'none',
  parking_price: String(value?.parking_price || ''),
  electric_reel_power: Boolean(value?.electric_reel_power),
  air_conditioner: Boolean(value?.air_conditioner),
  fish_finder: value?.fish_finder || { enabled: false, makers: [] },
  searchlight_type: value?.searchlight_type || 'none',
  life_jacket_rental: value?.life_jacket_rental || 'none',
  life_jacket_rental_price: String(value?.life_jacket_rental_price || ''),
  rod_keeper: Boolean(value?.rod_keeper),
  tanken_maru: Boolean(value?.tanken_maru),
  custom_facilities: value?.custom_facilities || [],
})

const ToggleRow = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', marginBottom: '8px', background: colors.card, border: `0.5px solid ${colors.border}`, borderRadius: '9px', color: colors.text, fontSize: '15px', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
  >
    <span>{label}</span>
    <span style={{ width: '46px', height: '26px', borderRadius: '13px', background: checked ? colors.action : '#D1D5DB', position: 'relative', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </span>
  </button>
)

export default function VesselPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [facilities, setFacilities] = useState<Facilities>(defaultFacilities())
  const [photos, setPhotos] = useState<VesselPhoto[]>([])
  const [customInput, setCustomInput] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('vessels').select('*').eq('user_id', session.user.id).single()
      if (!data) { router.push('/register'); return }
      setVessel(data as Vessel)
      setFacilities(defaultFacilities((data as Vessel).facilities))
      const { data: ph } = await supabase.from('vessel_photos').select('*').eq('vessel_id', data.id).order('sort_order')
      setPhotos((ph || []) as VesselPhoto[])
      setLoading(false)
    }
    init()
  }, [router])

  const update = (key: keyof Vessel, value: string | number | boolean | null) => setVessel(v => v ? { ...v, [key]: value } : v)
  const updateFacility = (key: keyof Facilities, value: unknown) => setFacilities(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!vessel) return
    setSaving(true)
    const { error } = await supabase.from('vessels').update({
      name: vessel.name,
      captain_name: vessel.captain_name,
      capacity: Number(vessel.capacity || 0),
      prefecture: vessel.prefecture || '',
      port_name: vessel.port_name || '',
      access: vessel.access || '',
      departure_time: vessel.departure_time || '',
      charter_accepted: vessel.charter_accepted,
      beginner_accepted: vessel.beginner_accepted,
      price: vessel.price || '',
      logo_url: vessel.logo_url || '',
      banner_url: vessel.banner_url || '',
      map_embed_url: vessel.map_embed_url || '',
      max_bookings_per_customer: Number(vessel.max_bookings_per_customer || 5),
      facilities,
    }).eq('id', vessel.id)
    setSaving(false)
    if (!error && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('setup') === 'true') {
      router.push('/dashboard/setup?step=2')
      return
    }
    setSaved(error ? '保存できませんでした' : '保存しました')
    setTimeout(() => setSaved(''), 2500)
  }

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>, kind: 'logo' | 'banner' | 'photo' | 'license') => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !vessel) return
    const path = `${vessel.id}/${kind}-${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('vessel-images').upload(path, file, { upsert: true })
    if (error) { setSaved('アップロードできませんでした'); return }
    const { data: { publicUrl } } = supabase.storage.from('vessel-images').getPublicUrl(path)
    if (kind === 'logo' || kind === 'banner' || kind === 'license') {
      const key = kind === 'logo' ? 'logo_url' : kind === 'banner' ? 'banner_url' : 'license_image_url'
      await supabase.from('vessels').update({ [key]: publicUrl }).eq('id', vessel.id)
      setVessel(v => v ? { ...v, [key]: publicUrl } as Vessel : v)
    } else {
      const { data } = await supabase.from('vessel_photos').insert([{ vessel_id: vessel.id, url: publicUrl, caption: '', sort_order: photos.length }]).select().single()
      if (data) setPhotos(prev => [...prev, data as VesselPhoto])
    }
    setSaved('アップロードしました')
    setTimeout(() => setSaved(''), 2000)
  }

  const addCustom = () => {
    const label = customInput.trim()
    if (!label) return
    updateFacility('custom_facilities', [...(facilities.custom_facilities || []), { label }])
    setCustomInput('')
  }

  if (loading || !vessel) return <LoadingScreen />
  const reserveUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reserve/${vessel.id}`

  return (
    <PageShell title="船情報" back>
      {saved && <div style={{ ...cardStyle, background: saved.includes('でき') ? colors.redBg : colors.greenBg, color: saved.includes('でき') ? colors.action : colors.green }}>{saved}</div>}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>基本情報</h2>
        {[
          ['船名', 'name'], ['船長名', 'captain_name'], ['都道府県', 'prefecture'], ['出港場所', 'port_name'], ['アクセス', 'access'], ['出船時刻', 'departure_time'], ['乗船料', 'price'], ['地図リンク', 'map_embed_url'],
        ].map(([label, key]) => <div key={key} style={{ marginBottom: '12px' }}><label>{label}</label><input value={String(vessel[key as keyof Vessel] || '')} onChange={e => update(key as keyof Vessel, e.target.value)} style={{ ...inputStyle, marginTop: '8px' }} /></div>)}
        <label>定員</label><input type="number" value={vessel.capacity || ''} onChange={e => update('capacity', Number(e.target.value))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
        <label>1人あたり予約上限</label><input type="number" value={vessel.max_bookings_per_customer || 5} onChange={e => update('max_bookings_per_customer', Number(e.target.value))} style={{ ...inputStyle, margin: '8px 0 12px' }} />
        <label>駐車場</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>{[{ key: 'free', label: '無料' }, { key: 'paid', label: '有料' }, { key: 'coin', label: '近隣コインパーキング' }].map(opt => <button key={opt.key} onClick={() => updateFacility('parking', opt.key)} style={facilities.parking === opt.key ? primaryButtonStyle : secondaryButtonStyle}>{opt.label}</button>)}</div>
        {facilities.parking === 'paid' && <input placeholder="駐車料金" value={facilities.parking_price || ''} onChange={e => updateFacility('parking_price', e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={() => update('beginner_accepted', !vessel.beginner_accepted)} style={vessel.beginner_accepted ? primaryButtonStyle : secondaryButtonStyle}>初心者歓迎</button>
          <button onClick={() => update('charter_accepted', !vessel.charter_accepted)} style={vessel.charter_accepted ? primaryButtonStyle : secondaryButtonStyle}>貸切OK</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>画像</h2>
        <label style={secondaryButtonStyle}>ロゴを選ぶ<input type="file" accept="image/*" onChange={e => uploadPhoto(e, 'logo')} style={{ display: 'none' }} /></label>
        <label style={{ ...secondaryButtonStyle, marginLeft: '8px' }}>バナーを選ぶ<input type="file" accept="image/*" onChange={e => uploadPhoto(e, 'banner')} style={{ display: 'none' }} /></label>
        <label style={{ ...secondaryButtonStyle, display: 'block', marginTop: '8px' }}>船の写真を追加<input type="file" accept="image/*" onChange={e => uploadPhoto(e, 'photo')} style={{ display: 'none' }} /></label>
        <label style={{ ...secondaryButtonStyle, display: 'block', marginTop: '8px' }}>遊漁船業者登録票を追加<input type="file" accept="image/*" onChange={e => uploadPhoto(e, 'license')} style={{ display: 'none' }} /></label>
        {photos.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>{photos.map(p => <img key={p.id} src={p.url} alt="船の写真" style={{ width: '100%', borderRadius: '8px', border: `0.5px solid ${colors.border}` }} />)}</div>}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>設備</h2>
        {[
          ['電動リール用電源', 'electric_reel_power'], ['エアコン', 'air_conditioner'], ['ロッドキーパー', 'rod_keeper'], ['探見丸', 'tanken_maru'],
        ].map(([label, key]) => <ToggleRow key={key} label={label} checked={Boolean(facilities[key as keyof Facilities])} onToggle={() => updateFacility(key as keyof Facilities, !facilities[key as keyof Facilities])} />)}
        <label>集魚灯</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>{[{ key: 'metal_halide', label: 'メタハラ' }, { key: 'led', label: 'LED' }, { key: 'none', label: 'なし' }].map(opt => <button key={opt.key} onClick={() => updateFacility('searchlight_type', opt.key)} style={facilities.searchlight_type === opt.key ? primaryButtonStyle : secondaryButtonStyle}>{opt.label}</button>)}</div>
        <label>ライフジャケット貸出</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '8px 0 12px' }}>{[{ key: 'free', label: 'あり' }, { key: 'paid', label: '有料' }, { key: 'none', label: 'なし' }].map(opt => <button key={opt.key} onClick={() => updateFacility('life_jacket_rental', opt.key)} style={facilities.life_jacket_rental === opt.key ? primaryButtonStyle : secondaryButtonStyle}>{opt.label}</button>)}</div>
        {facilities.life_jacket_rental === 'paid' && <input placeholder="貸出料金" value={facilities.life_jacket_rental_price || ''} onChange={e => updateFacility('life_jacket_rental_price', e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />}
        <label>こだわり設備</label>
        <div style={{ display: 'flex', gap: '8px', margin: '8px 0 12px' }}><input value={customInput} onChange={e => setCustomInput(e.target.value)} style={inputStyle} /><button onClick={addCustom} style={secondaryButtonStyle}>追加</button></div>
        {(facilities.custom_facilities || []).map((item, index) => <div key={`${item.label}-${index}`} style={{ color: colors.sub, marginBottom: '4px' }}>{item.label}</div>)}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>予約ページQR</h2>
        <div style={{ background: '#FFFFFF', padding: '16px', display: 'inline-block', border: `0.5px solid ${colors.border}` }}><QRCodeSVG value={reserveUrl} bgColor="#FFFFFF" fgColor="#1C1917" /></div>
        <div style={{ color: colors.sub, marginTop: '8px', wordBreak: 'break-all' }}>{reserveUrl}</div>
      </div>

      <button disabled={saving} onClick={save} style={{ ...primaryButtonStyle, width: '100%' }}>{saving ? '保存中...' : '保存する'}</button>
    </PageShell>
  )
}
