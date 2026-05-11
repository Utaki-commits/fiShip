'use client'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
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
  auto_confirm: boolean
  logo_url: string
  banner_url: string
  map_embed_url: string
  subscribed_at: string
}

const areas: Record<string, string[]> = {}

const inputStyle = {
  width: '100%', padding: '14px 16px', fontSize: '18px', border: '2px solid var(--border)', borderRadius: '10px', fontFamily: 'inherit', color: 'var(--fg-1)', background: 'var(--surface)', boxSizing: 'border-box' as const,
}
const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', marginBottom: '12px' }
const titleStyle = { fontSize: '18px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '14px' }
const labelStyle = { fontSize: '16px', fontWeight: 600, color: 'var(--fg-2)', display: 'block', marginBottom: '8px' }
const togSw = (active: boolean) => ({
  width: '64px',
  height: '36px',
  borderRadius: '18px',
  background: active ? 'var(--gold)' : '#D1D5DB',
  position: 'relative' as const,
  flexShrink: 0 as const,
  transition: 'background .2s',
})

const getExpiryDate = (subscribedAt: string): string => {
  const start = new Date(subscribedAt)
  const expiry = new Date(start)
  expiry.setDate(expiry.getDate() + 30)
  return `${expiry.getFullYear()}年${expiry.getMonth()+1}月${expiry.getDate()}日`
}

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
  const [cropImage, setCropImage] = useState<{ src: string, type: 'logo' | 'banner' } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
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
      const v = { ...data, auto_confirm: data.auto_confirm ?? true } as Vessel
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

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropImage({ src: reader.result as string, type })
    reader.readAsDataURL(file)
  }

  const uploadCroppedImage = async () => {
    if (!vessel || !cropImage) return
    setUploadingImage(true)
    setError('')
    try {
      const img = new Image()
      img.src = cropImage.src
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('image load failed'))
      })

      const isBanner = cropImage.type === 'banner'
      const ratio = isBanner ? 16 / 9 : 1
      const maxWidth = isBanner ? 1200 : 400
      const maxHeight = isBanner ? 675 : 400
      let sourceWidth = img.naturalWidth
      let sourceHeight = sourceWidth / ratio
      if (sourceHeight > img.naturalHeight) {
        sourceHeight = img.naturalHeight
        sourceWidth = sourceHeight * ratio
      }
      const sourceX = (img.naturalWidth - sourceWidth) / 2
      const sourceY = (img.naturalHeight - sourceHeight) / 2
      const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(sourceWidth * scale)
      canvas.height = Math.round(sourceHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas context failed')
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => result ? resolve(result) : reject(new Error('blob failed')), 'image/jpeg', 0.88)
      })
      const path = `${vessel.id}/${cropImage.type}.jpg`
      const { error: uploadError } = await supabase.storage.from('vessel-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('vessel-images').getPublicUrl(path)
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`
      await supabase.from('vessels').update(
        cropImage.type === 'logo' ? { logo_url: cacheBustedUrl } : { banner_url: cacheBustedUrl }
      ).eq('id', vessel.id)
      setVessel(v => v ? { ...v, [cropImage.type === 'logo' ? 'logo_url' : 'banner_url']: cacheBustedUrl } : v)
      setCropImage(null)
    } catch {
      setError('画像のアップロードに失敗しました')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!vessel) return
    setSaving(true); setError(''); setSaved(false)
    const { error: saveError } = await supabase.from('vessels').update({
      name: vessel.name, captain_name: vessel.captain_name, prefecture: vessel.prefecture,
      port_name: vessel.port_name, access: vessel.access, notify_enabled: notifyEnabled,
      notify_hours: `${notifyStart}:00〜${notifyEnd}:00`, font_size: fontSize, color_mode: colorMode,
      auto_confirm: vessel.auto_confirm,
      // Googleマップ機能は一時停止中。再開時は下記を戻す。
      // map_embed_url: vessel.map_embed_url,
    }).eq('id', vessel.id)
    if (saveError) { setError('保存に失敗しました'); setSaving(false); return }
    document.body.dataset.fontsize = fontSize
    document.body.dataset.colormode = colorMode
    localStorage.setItem('fontsize', fontSize)
    localStorage.setItem('colormode', colorMode)
    setSaved(true); setSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (!vessel) return
    await supabase.from('vessels').delete().eq('id', vessel.id)
    window.location.href = '/api/auth/logout'
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
            <input ref={bannerInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={e => handleImageSelect(e, 'banner')} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '16px', overflow: 'hidden', background: vessel.logo_url ? 'transparent' : 'var(--ocean-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{vessel.logo_url ? <img src={vessel.logo_url} alt='ロゴ画像' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '⚓'}</div>
            <button onClick={() => logoInputRef.current?.click()} style={{ minHeight: '56px', padding: '0 20px', border: '2px solid var(--border)', borderRadius: '10px', background: 'var(--surface)', fontSize: '16px', fontWeight: 700 }}>ロゴを変更する</button>
            <input ref={logoInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={e => handleImageSelect(e, 'logo')} />
          </div>
        </section>
        <section style={sectionStyle}>
          <div style={titleStyle}>基本情報</div>
          <label style={labelStyle}>船名</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.name} onChange={e => update('name', e.target.value)} />
          <label style={labelStyle}>船長名</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.captain_name} onChange={e => update('captain_name', e.target.value)} />
          <label style={labelStyle}>都道府県</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.prefecture} onChange={e => update('prefecture', e.target.value)} />
          <label style={labelStyle}>港名・出船場所</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.port_name} onChange={e => update('port_name', e.target.value)} />
          <label style={labelStyle}>アクセス情報</label><input style={{ ...inputStyle, marginBottom: '14px' }} value={vessel.access} onChange={e => update('access', e.target.value)} />
          {/* Googleマップ機能は一時停止中。再開時はこのブロックを戻す。
          <label style={labelStyle}>Googleマップ埋め込みURL（任意）</label>
          <div style={{ fontSize: '14px', color: 'var(--fg-3)', marginBottom: '8px', lineHeight: 1.6 }}>
            Googleマップで出港場所を検索 → 「共有」→「地図を埋め込む」→「HTMLをコピー」のsrc属性のURLを貼り付けてください
          </div>
          <input
            style={{ ...inputStyle, marginBottom: '14px' }}
            placeholder="https://www.google.com/maps/embed?pb=..."
            value={vessel.map_embed_url || ''}
            onChange={e => setVessel(v => v ? { ...v, map_embed_url: e.target.value } : v)}
          />
          {vessel.map_embed_url && (
            <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '14px' }}>
              <iframe
                src={vessel.map_embed_url}
                width="100%"
                height="200"
                style={{ border: 'none', display: 'block' }}
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
          */}
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
          <button onClick={() => setNotifyEnabled(v => !v)} style={{ width: '100%', minHeight: '64px', padding: '14px', borderRadius: '12px', border: notifyEnabled ? '2px solid var(--gold)' : '2px solid var(--border)', background: notifyEnabled ? '#FBF3D4' : 'var(--surface)', color: notifyEnabled ? '#7A5800' : 'var(--fg-1)', fontSize: '18px', fontWeight: 700, textAlign: 'left' }}>予約通知を受け取る: {notifyEnabled ? 'オン' : 'オフ'}</button>
          {notifyEnabled && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}><select value={notifyStart} onChange={e => setNotifyStart(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{i}:00</option>)}</select><span>〜</span><select value={notifyEnd} onChange={e => setNotifyEnd(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{i}:00</option>)}</select></div>}
        </section>
        <section style={sectionStyle}>
          <div style={titleStyle}>予約設定</div>
          <button
            type="button"
            onClick={() => setVessel(v => v ? { ...v, auto_confirm: !v.auto_confirm } : v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '16px',
              background: vessel.auto_confirm ? '#FBF3D4' : 'var(--surface)',
              border: vessel.auto_confirm ? '2px solid var(--gold)' : '2px solid var(--border)',
              borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: vessel.auto_confirm ? '#7A5800' : 'var(--fg-1)' }}>
                空きがある予約を自動で承認する
              </div>
              <div style={{ fontSize: '15px', color: vessel.auto_confirm ? '#7A5800' : 'var(--fg-2)', marginTop: '4px', lineHeight: 1.6 }}>
                OFFにすると全ての予約が承認待ちになります
              </div>
            </div>
            <div style={togSw(vessel.auto_confirm ?? true)}>
              <div style={{
                position: 'absolute', top: '4px',
                left: vessel.auto_confirm ? '32px' : '4px',
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--surface)', boxShadow: '0 2px 6px rgba(0,0,0,.25)',
                transition: 'left .2s'
              }} />
            </div>
          </button>
        </section>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', minHeight: '64px', border: 'none', borderRadius: '14px', background: saving ? 'var(--border)' : 'var(--ocean)', color: saving ? 'var(--fg-3)' : '#fff', fontSize: '20px', fontWeight: 700 }}>{saving ? '保存中...' : '変更を保存する'}</button>
        <section style={{ ...sectionStyle, marginTop: '12px' }}>
          <div style={titleStyle}>アカウント</div>
          <button onClick={() => { window.location.href = '/api/auth/logout' }} style={{ width: '100%', padding: '18px', fontSize: '20px', fontWeight: 700, background: 'var(--ocean)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px' }}>
            ログアウト
          </button>
          <button onClick={() => setShowDeleteModal(true)} style={{ width: '100%', padding: '18px', fontSize: '20px', fontWeight: 700, background: 'var(--status-full-bg)', color: 'var(--status-full-fg)', border: '2px solid var(--status-full-bd)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            サービスを解約する
          </button>
        </section>
      </main>
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '28px 22px', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '16px' }}>
              解約の確認
            </div>

            <div style={{ background: 'var(--status-day-bg)', border: '2px solid var(--ocean-light)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', color: 'var(--ocean)', marginBottom: '8px' }}>
                解約後もご利用いただける期限
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--ocean)', lineHeight: 1.2, marginBottom: '8px' }}>
                {vessel ? getExpiryDate(vessel.subscribed_at) : ''}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--ocean)', lineHeight: 1.6 }}>
                それ以降は自動的にサービスが停止されます。
              </div>
            </div>

            <div style={{ background: 'var(--status-full-bg)', border: '2px solid var(--status-full-bd)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-full-fg)', lineHeight: 1.7 }}>
                ⚠️ 料金の返金はいたしません。
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '16px', fontSize: '18px', fontWeight: 700, background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--fg-1)' }}>
                キャンセル
              </button>
              <button onClick={handleDeleteAccount} style={{ flex: 1, padding: '16px', fontSize: '18px', fontWeight: 700, background: 'var(--status-full-fg)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                解約する
              </button>
            </div>
          </div>
        </div>
      )}
      {cropImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: 'var(--surface)', borderRadius: '16px', padding: '18px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg-1)', marginBottom: '12px' }}>
              {cropImage.type === 'banner' ? 'バナー画像を確認' : 'ロゴ画像を確認'}
            </div>
            <div style={{ width: '100%', aspectRatio: cropImage.type === 'banner' ? '16 / 9' : '1 / 1', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg)', marginBottom: '14px' }}>
              <img src={cropImage.src} alt="トリミングプレビュー" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div style={{ fontSize: '14px', color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: '16px' }}>
              {cropImage.type === 'banner' ? '16:9の横長に中央トリミングして保存します。' : '1:1の正方形に中央トリミングして保存します。'}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCropImage(null)} disabled={uploadingImage} style={{ flex: 1, minHeight: '56px', border: '2px solid var(--border)', borderRadius: '12px', background: 'var(--surface)', color: 'var(--fg-1)', fontSize: '18px', fontWeight: 700 }}>
                キャンセル
              </button>
              <button onClick={uploadCroppedImage} disabled={uploadingImage} style={{ flex: 1, minHeight: '56px', border: 'none', borderRadius: '12px', background: uploadingImage ? 'var(--border)' : 'var(--ocean)', color: uploadingImage ? 'var(--fg-3)' : '#fff', fontSize: '18px', fontWeight: 700 }}>
                {uploadingImage ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
