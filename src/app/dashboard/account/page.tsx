'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type VesselForm = {
  id: string
  name: string
  captain_name: string
  prefecture: string
  port_name: string
  access: string
  price: string
  capacity: number
  logo_url: string
  banner_url: string
}

const emptyForm: VesselForm = {
  id: '',
  name: '',
  captain_name: '',
  prefecture: '',
  port_name: '',
  access: '',
  price: '',
  capacity: 4,
  logo_url: '',
  banner_url: '',
}

const inputStyle = {
  width: '100%',
  padding: '16px',
  fontSize: '18px',
  border: '2px solid var(--border)',
  borderRadius: '8px',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
  color: 'var(--fg-1)',
  background: 'var(--surface)',
}

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '14px',
}

export default function AccountPage() {
  const router = useRouter()
  const [form, setForm] = useState<VesselForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'banner' | 'logo' | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      if (!res.ok) { router.push('/login'); return }

      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels')
        .select('id, name, captain_name, prefecture, port_name, access, price, capacity, logo_url, banner_url')
        .eq('user_id', user.sub)
        .single()

      if (!vessel) { router.push('/register'); return }
      setForm({
        id: vessel.id,
        name: vessel.name || '',
        captain_name: vessel.captain_name || '',
        prefecture: vessel.prefecture || '',
        port_name: vessel.port_name || '',
        access: vessel.access || '',
        price: vessel.price || '',
        capacity: vessel.capacity || 4,
        logo_url: vessel.logo_url || '',
        banner_url: vessel.banner_url || '',
      })
      setLoading(false)
    }
    init()
  }, [router])

  const update = (key: keyof VesselForm, value: string | number) => {
    setSaved(false)
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const uploadImage = async (file: File, path: string) => {
    const { error } = await supabase.storage
      .from('vessel-images')
      .upload(path, file, { upsert: true })
    if (error) return null
    const { data: { publicUrl } } = supabase.storage
      .from('vessel-images')
      .getPublicUrl(path)
    return publicUrl
  }

  const handleImageSelect = async (kind: 'banner' | 'logo', file: File | null) => {
    if (!file) return
    setUploading(kind)
    setError('')
    setSaved(false)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const publicUrl = await uploadImage(file, `${form.id}/${kind}-${Date.now()}.${ext}`)
      const data = { error: '' }
      if (!publicUrl) {
        setError(data.error || '画像の保存に失敗しました')
        return
      }
      update(kind === 'banner' ? 'banner_url' : 'logo_url', publicUrl)
    } catch {
      setError('画像の保存に失敗しました')
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.captain_name.trim()) {
      setError('船名と船長名を入力してください')
      return
    }
    if (!form.prefecture.trim() || !form.port_name.trim()) {
      setError('都道府県と港名を入力してください')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('vessels')
        .update({
          name: form.name,
          captain_name: form.captain_name,
          prefecture: form.prefecture,
          port_name: form.port_name,
          access: form.access,
          price: form.price,
          capacity: form.capacity,
          logo_url: form.logo_url,
          banner_url: form.banner_url,
        })
        .eq('id', form.id)

      if (updateError) {
        setError('保存に失敗しました。もう一度お試しください。')
        return
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const imageInput = (kind: 'banner' | 'logo', label: string, shape: 'wide' | 'square') => {
    const url = kind === 'banner' ? form.banner_url : form.logo_url
    return (
      <div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '8px' }}>{label}</div>
        {url && (
          <div style={{
            width: shape === 'wide' ? '100%' : '104px',
            aspectRatio: shape === 'wide' ? '16 / 6' : '1 / 1',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: '10px',
            background: 'var(--bg)',
          }}>
            <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <label style={{
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          borderRadius: '10px',
          border: '2px solid var(--ocean)',
          color: 'var(--ocean)',
          background: 'var(--surface)',
          fontSize: '18px',
          fontWeight: 700,
          cursor: uploading ? 'wait' : 'pointer',
        }}>
          {uploading === kind ? '保存中...' : '画像を選ぶ'}
          <input
            type="file"
            accept="image/*"
            disabled={Boolean(uploading)}
            onChange={e => handleImageSelect(kind, e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    )
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--ocean)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--surface)', fontSize: '18px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.push('/dashboard')} style={{ minHeight: '56px', padding: '0 14px', border: '2px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', color: 'var(--fg-1)', fontSize: '18px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
          ← 戻る
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--fg-1)' }}>アカウント設定</h1>
      </div>

      <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>船の写真</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {imageInput('banner', 'バナー画像アップロード（横長）', 'wide')}
            {imageInput('logo', 'ロゴ画像アップロード（正方形）', 'square')}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>基本情報</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>船名<input value={form.name} onChange={e => update('name', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }} /></label>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>船長名<input value={form.captain_name} onChange={e => update('captain_name', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }} /></label>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>都道府県<input value={form.prefecture} onChange={e => update('prefecture', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }} /></label>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>港名<input value={form.port_name} onChange={e => update('port_name', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }} /></label>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>アクセス<input value={form.access} onChange={e => update('access', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }} /></label>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>乗船料<textarea value={form.price} onChange={e => update('price', e.target.value)} rows={3} style={{ ...inputStyle, marginTop: '6px', resize: 'none', lineHeight: 1.6 }} /></label>
            <label style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg-2)' }}>定員<input type="number" min={1} max={99} value={form.capacity} onChange={e => update('capacity', Math.max(1, Math.min(99, Number(e.target.value) || 1)))} style={{ ...inputStyle, marginTop: '6px', textAlign: 'center', fontSize: '22px', fontWeight: 700 }} /></label>
          </div>
        </section>

        {error && <div style={{ background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '1px solid var(--status-full-bd)', borderRadius: '10px', padding: '14px', fontSize: '18px', fontWeight: 700 }}>{error}</div>}
        {saved && <div style={{ background: 'var(--status-day-bg)', color: 'var(--ocean)', border: '1px solid var(--ocean-light)', borderRadius: '10px', padding: '14px', fontSize: '18px', fontWeight: 700 }}>保存しました</div>}

        <button onClick={handleSave} disabled={saving || Boolean(uploading)} style={{ minHeight: '64px', border: 'none', borderRadius: '12px', background: saving ? 'var(--border)' : 'var(--ocean)', color: saving ? 'var(--fg-3)' : 'var(--surface)', fontSize: '22px', fontWeight: 700, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? '保存中...' : '保存する'}
        </button>

        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 14px', fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)' }}>その他</h2>
          <button onClick={() => { window.location.href = '/api/auth/logout' }} style={{ width: '100%', minHeight: '64px', border: 'none', borderRadius: '12px', background: 'var(--status-full-fg)', color: 'var(--surface)', fontSize: '22px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            ログアウト
          </button>
        </section>
      </main>
    </div>
  )
}
