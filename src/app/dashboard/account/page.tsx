'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Vessel = {
  id: string
  name: string
  captain_name: string
  prefecture: string
  port_name: string
  access: string
  notify_enabled?: boolean
  notify_hours: string
  font_size?: string
  color_mode?: string
  logo_url: string
  banner_url: string
}

const areas: Record<string, string[]> = {}

const inputStyle = {
  width: '100%', padding: '14px 16px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', color: 'var(--fg-1)', background: 'var(--surface)', boxSizing: 'border-box' as const,
}
const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '12px' }
const titleStyle = { fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '14px' }
const labelStyle = { fontSize: '16px', fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: '8px' }

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [notifyStart, setNotifyStart] = useState('6')
  const [notifyEnd, setNotifyEnd] = useState('21')
  const [fontSize, setFontSize] = useState<'small'|'medium'|'large'>('medium')
  const [colorMode, setColorMode] = useState<'light'|'dark'>('light')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      if (!res.ok) { router.push('/login'); return }
      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }
      const { data } = await supabase.from('vessels').select('*').eq('user_id', user.sub).single()
      if (!data) { router.push('/register'); return }
      const v = data as Vessel
      setVessel(v)
      setNotifyEnabled(v.notify_enabled ?? true)
      setFontSize((v.font_size as 'small'|'medium'|'large') || 'medium')
      setColorMode((v.color_mode as 'light'|'dark') || 'light')
      const match = (v.notify_hours || '').match(/(\d+).*?(\d+)/)
      if (match) { setNotifyStart(match[1]); setNotifyEnd(match[2]) }
      setLoading(false)
    }
    init()
  }, [router])

  const update = (key: keyof Vessel, value: string) => setVessel(v => v ? { ...v, [key]: value } : v)

  const uploadImage = async (file: File, type: 'logo' | 'banner') => {
    if (!vessel) return
    setError('')
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${vessel.id}/${type}.${ext}`
    const { error: uploadError } = await supabase.storage.from('vessel-images').upload(path, file, { upsert: true })
    if (uploadError) { setError('画像のアップロードに失敗しました'); return }
    const { data: { publicUrl } } = supabase.storage.from('vessel-images').getPublicUrl(path)
    await supabase.from('vessels').update(type === 'logo' ? { logo_url: publicUrl } : { banner_url: publicUrl }).eq('id', vessel.id)
    setVessel(v => v ? { ...v, [type === 'logo' ? 'logo_url' : 'banner_url']: publicUrl } : v)
  }

  const handleSave = async () => {
    if (!vessel) return
    setSaving(true); setError(''); setSaved(false)
    const { error: saveError } = await supabase.from('vessels').update({
      name: vessel.name, captain_name: vessel.captain_name, prefecture: vessel.prefecture,
      port_name: vessel.port_name, access: vessel.access, notify_enabled: notifyEnabled,
      notify_hours: `${notifyStart}:00〜${notifyEnd}:00`, font_size: fontSize, color_mode: colorMode,
    }).eq('id', vessel.id)
    if (saveError) { setError('保存に失敗しました'); setSaving(false); return }
    document.body.dataset.fontsize = fontSize
    document.body.dataset.colormode = colorMode
    localStorage.setItem('fontsize', fontSize)
    localStorage.setItem('colormode', colorMode)
    setSaved(true); setSaving(false)
  }
  if (loading) return <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--surface)', fontSize: '18px' }}>読み込み中...</div></main>
  if (!vessel) return null

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: 'linear-gradient(180deg, var(--ocean) 0%, #0F4570 100%)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={() => router.push('/dashboard')} style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--surface)', fontSize: '22px' }}>←</button>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--surface)' }}>設定</div>
      </div>
      <main style={{ padding: '16px' }}>
        {error && <div style={{ background: 'var(--status-full-bg)', border: '2px solid var(--status-full-bd)', borderRadius: '12px', padding: '14px', marginBottom: '12px', fontSize: '16px', fontWeight: 700, color: 'var(--status-full-fg)' }}>{error}</div>}
        {saved && <div style={{ background: 'var(--status-ok-bg)', border: '2px solid var(--status-ok-bd)', borderRadius: '12px', padding: '14px', marginBottom: '12px', fontSize: '16px', fontWeight: 700, color: 'var(--status-ok-fg)' }}>保存しました</div>}
        <section style={sectionStyle}>
          <div style={titleStyle}>船のプロフィール写真</div>
          <div style={{ height: '140px', borderRadius: '12px', overflow: 'hidden', background: vessel.banner_url ? 'transparent' : 'var(--ocean)', marginBottom: '12px', position: 'relative' }}>
            {vessel.banner_url && <img src={vessel.banner_url} alt='バナー画像' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            {!vessel.banner_url && <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>バナー画像未設定</div>}
            <button onClick={() => bannerInputRef.current?.click()} style={{ position: 'absolute', right: '8px', bottom: '8px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: '16px', fontWeight: 700 }}>変更</button>
            <input ref={bannerInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'banner')} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '16px', overflow: 'hidden', background: vessel.logo_url ? 'transparent' : 'var(--ocean-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{vessel.logo_url ? <img src={vessel.logo_url} alt='ロゴ画像' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚓'}</div>
            <button onClick={() => logoInputRef.current?.click()} style={{ minHeight: '56px', padding: '0 20px', border: '2px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', fontSize: '16px', fontWeight: 700 }}>ロゴを変更する</button>
            <input ref={logoInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo')} />
          </div>
        </section>
        <section style={sectionStyle}>
          <div style={titleStyle}>基本情報</div>
          <label style={labelStyle}>船名</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.name} onChange={e => update('name', e.target.value)} />
          <label style={labelStyle}>船長名</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.captain_name} onChange={e => update('captain_name', e.target.value)} />
          <label style={labelStyle}>都道府県</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.prefecture} onChange={e => update('prefecture', e.target.value)} />
          <label style={labelStyle}>港名・出船場所</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.port_name} onChange={e => update('port_name', e.target.value)} />
          <label style={labelStyle}>アクセス情報</label><input style={inputStyle} value={vessel.access} onChange={e => update('access', e.target.value)} />
        </section>
        <section style={sectionStyle}>
          <div style={titleStyle}>文字サイズ</div>
          <div style={{ display: 'flex', gap: '8px' }}>{(['small','medium','large'] as const).map(key => <button key={key} onClick={() => setFontSize(key)} style={{ flex: 1, minHeight: '56px', borderRadius: '12px', border: fontSize === key ? '3px solid var(--ocean)' : '2px solid var(--border)', background: fontSize === key ? 'var(--ocean)' : 'var(--surface)', color: fontSize === key ? '#fff' : 'var(--fg-2)', fontSize: key === 'small' ? '16px' : key === 'large' ? '24px' : '20px', fontWeight: 700 }}>{key === 'small' ? '小' : key === 'large' ? '大' : '標準'}</button>)}</div>
        </section>
        <section style={sectionStyle}>
          <div style={titleStyle}>カラーモード</div>
          <div style={{ display: 'flex', gap: '8px' }}>{(['light','dark'] as const).map(key => <button key={key} onClick={() => setColorMode(key)} style={{ flex: 1, minHeight: '56px', borderRadius: '12px', border: colorMode === key ? '3px solid var(--ocean)' : '2px solid var(--border)', background: colorMode === key ? 'var(--ocean)' : 'var(--surface)', color: colorMode === key ? '#fff' : 'var(--fg-2)', fontSize: '18px', fontWeight: 700 }}>{key === 'light' ? 'ライト' : 'ダーク'}</button>)}</div>
        </section>
        <section style={sectionStyle}>
          <div style={titleStyle}>通知設定</div>
          <button onClick={() => setNotifyEnabled(v => !v)} style={{ width: '100%', minHeight: '64px', padding: '14px', borderRadius: '12px', border: notifyEnabled ? '2px solid var(--gold)' : '2px solid var(--border)', background: notifyEnabled ? '#FBF3D4' : 'var(--surface)', fontSize: '18px', fontWeight: 700, textAlign: 'left' }}>予約通知を受け取る: {notifyEnabled ? 'オン' : 'オフ'}</button>
          {notifyEnabled && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}><select value={notifyStart} onChange={e => setNotifyStart(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{i}:00</option>)}</select><span>〜</span><select value={notifyEnd} onChange={e => setNotifyEnd(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{i}:00</option>)}</select></div>}
        </section>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', minHeight: '64px', border: 'none', borderRadius: '14px', background: saving ? 'var(--border)' : 'var(--ocean)', color: saving ? 'var(--fg-3)' : '#fff', fontSize: '20px', fontWeight: 700 }}>{saving ? '保存中...' : '変更を保存する'}</button>
        <section style={{ ...sectionStyle, marginTop: '12px' }}>
          <div style={titleStyle}>アカウント</div>
          <button onClick={() => { window.location.href = '/api/auth/logout' }} style={{ width: '100%', minHeight: '64px', border: 'none', borderRadius: '12px', background: 'var(--ocean)', color: '#fff', fontSize: '18px', fontWeight: 700 }}>ログアウト</button>
        </section>
      </main>
    </div>
  )
}
