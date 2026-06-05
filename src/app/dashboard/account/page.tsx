'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CaptainHeader from '@/components/CaptainHeader'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle } from '../_components/CaptainShell'

type Vessel = { id: string; notify_enabled: boolean | null; font_size: string | null; color_mode: string | null; auto_confirm: boolean | null; subscribed_at: string | null; date_format: 'western' | 'japanese' | null }

const expiry = (subscribedAt: string | null) => {
  if (!subscribedAt) return '未設定'
  const d = new Date(subscribedAt)
  d.setDate(d.getDate() + 30)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

const ToggleRow = ({ title, description, checked, onToggle }: { title: string; description: string; checked: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%', padding: '14px', marginBottom: '8px', background: '#FFFFFF', border: '0.5px solid #CDD3DC', borderRadius: '9px', color: '#1A2420', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}
  >
    <span>
      <span style={{ display: 'block', fontSize: '15px', fontWeight: 500 }}>{title}</span>
      <span style={{ display: 'block', fontSize: '13px', color: '#5A6A78', lineHeight: 1.5, marginTop: '2px' }}>{description}</span>
    </span>
    <span style={{ width: '46px', height: '26px', borderRadius: '13px', background: checked ? '#1E4D3A' : '#D1D5DB', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </span>
  </button>
)

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [saved, setSaved] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('vessels').select('id, notify_enabled, font_size, color_mode, auto_confirm, subscribed_at, date_format').eq('user_id', session.user.id).single()
      if (!data) { router.push('/register'); return }
      setVessel(data as Vessel)
      setLoading(false)
    }
    init()
  }, [router])

  const setValue = (key: keyof Vessel, value: string | boolean | null) => setVessel(v => v ? { ...v, [key]: value } : v)

  const save = async () => {
    if (!vessel) return
    setSaving(true)
    const { error } = await supabase.from('vessels').update({ notify_enabled: vessel.notify_enabled ?? true, font_size: vessel.font_size || 'medium', color_mode: vessel.color_mode || 'light', auto_confirm: vessel.auto_confirm ?? true, date_format: vessel.date_format || 'western' }).eq('id', vessel.id)
    setSaving(false)
    setSaved(error ? '保存できませんでした' : '保存しました')
    setTimeout(() => setSaved(''), 2200)
  }

  const deleteAccount = async () => {
    if (!vessel) return
    await supabase.from('vessels').delete().eq('id', vessel.id)
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || !vessel) return <LoadingScreen />

  return (
    <PageShell title="設定" menu hero={<CaptainHeader vesselId={vessel.id} />}>
      {saved && <div style={{ ...cardStyle, background: saved.includes('でき') ? colors.redBg : colors.greenBg, color: saved.includes('でき') ? colors.action : colors.green }}>{saved}</div>}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>運営設定</h2>
        <ToggleRow title="通知" description="予約の確定や連絡が必要な予約を知らせます。" checked={vessel.notify_enabled ?? true} onToggle={() => setValue('notify_enabled', !(vessel.notify_enabled ?? true))} />
        <ToggleRow title="予約自動承認" description="予約申し込みを自動で承認します。" checked={vessel.auto_confirm ?? true} onToggle={() => setValue('auto_confirm', !(vessel.auto_confirm ?? true))} />
        <div style={{ color: colors.sub, marginTop: '10px' }}>通知時間帯の制限はありません。確定時に通知します。</div>
        <button onClick={() => setDeleteOpen(true)} style={{ ...dangerButtonStyle, width: '100%', marginTop: '16px' }}>アカウント削除</button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>見やすさ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>{['small','medium','large'].map(size => <button key={size} onClick={() => setValue('font_size', size)} style={vessel.font_size === size ? primaryButtonStyle : secondaryButtonStyle}>{size === 'small' ? '小' : size === 'large' ? '大' : '標準'}</button>)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>{['light','dark'].map(mode => <button key={mode} onClick={() => setValue('color_mode', mode)} style={vessel.color_mode === mode ? primaryButtonStyle : secondaryButtonStyle}>{mode === 'dark' ? '夜間' : '通常'}</button>)}</div>
        <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>日付表示形式</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { key: 'western', label: '西暦' },
            { key: 'japanese', label: '和暦' },
          ].map(option => <button key={option.key} onClick={() => setValue('date_format', option.key)} style={(vessel.date_format || 'western') === option.key ? primaryButtonStyle : secondaryButtonStyle}>{option.label}</button>)}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>利用状況</h2>
        <div style={{ color: colors.sub }}>無料期間終了予定: {expiry(vessel.subscribed_at)}</div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 14px' }}>法令表示・お問い合わせ</h2>
        <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: colors.action, marginBottom: '12px' }}>利用規約</a>
        <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: colors.action, marginBottom: '12px' }}>プライバシーポリシー</a>
        <a href="mailto:co.utaki@gmail.com" style={{ display: 'block', color: colors.action }}>運営へ問い合わせる</a>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <button disabled={saving} onClick={save} style={primaryButtonStyle}>{saving ? '保存中...' : '保存する'}</button>
      </div>

      {deleteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ ...cardStyle, width: '100%', maxWidth: '420px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 12px' }}>アカウントを削除しますか？</h3>
            <p style={{ color: colors.sub, lineHeight: 1.7 }}>船情報と予約管理が使えなくなります。この操作は取り消せません。</p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button onClick={deleteAccount} style={dangerButtonStyle}>削除する</button>
              <button onClick={() => setDeleteOpen(false)} style={secondaryButtonStyle}>戻る</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
