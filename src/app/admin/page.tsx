'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type VesselStatus = 'active' | 'locked' | 'suspended' | 'proxy'

type VesselWithStatus = {
  id: string
  name: string
  captain_name: string
  prefecture: string
  port_name: string
  created_at: string
  user_id: string
  user_email: string
  status: VesselStatus
}

type Tab = 'captains' | 'proxy' | 'locks'

// ステータスごとの表示設定
const STATUS_CONFIG: Record<VesselStatus, { label: string; bg: string; color: string }> = {
  active:    { label: '稼働中',     bg: '#D4EDDA', color: '#1B6B3A' },
  locked:    { label: 'ロックあり', bg: '#FEE2E2', color: '#B91C1C' },
  suspended: { label: '利用停止中', bg: '#FEF9C3', color: '#854D0E' },
  proxy:     { label: '代行登録',   bg: '#EEF2FF', color: '#4338CA' },
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// 代行登録フォームの初期値
const PROXY_FORM_INIT = {
  email: '', password: '', name: '', captain_name: '',
  prefecture: '', port_name: '', capacity: 4,
}

export default function AdminPage() {
  const [vessels, setVessels] = useState<VesselWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('captains')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [proxyForm, setProxyForm] = useState(PROXY_FORM_INIT)
  const [proxySaving, setProxySaving] = useState(false)
  const [proxyError, setProxyError] = useState('')
  const [proxySuccess, setProxySuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin/login'); return }

      // 管理者メールアドレスを確認する
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (adminEmail && session.user.email !== adminEmail) {
        await supabase.auth.signOut()
        router.push('/admin/login')
        return
      }

      await fetchVessels(session.access_token)
    }
    init()
  }, [router])

  // 全船長一覧を取得する
  const fetchVessels = async (token: string) => {
    try {
      const res = await fetch('/api/admin/vessels', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { router.push('/admin/login'); return }
      const data = await res.json()
      setVessels(data.vessels || [])
    } finally {
      setLoading(false)
    }
  }

  // ステータス変更アクションを実行する
  const handleAction = async (userId: string, action: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setActionLoading(userId + action)
    try {
      const res = await fetch('/api/admin/vessels', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId, action }),
      })
      if (res.ok) {
        // ローカル状態を即時更新する
        setVessels(prev => prev.map(v => {
          if (v.user_id !== userId) return v
          const newStatus: VesselStatus =
            action === 'lock' ? 'locked' :
            action === 'suspend' ? 'suspended' :
            v.status === 'proxy' ? 'proxy' : 'active'
          return { ...v, status: newStatus }
        }))
        setExpandedId(null)
      }
    } finally {
      setActionLoading(null)
    }
  }

  // 代行登録を実行する
  const handleProxyRegister = async () => {
    const { email, password, name, captain_name, prefecture, port_name } = proxyForm
    if (!email || !password || !name || !captain_name || !prefecture || !port_name) {
      setProxyError('すべての必須項目を入力してください')
      return
    }
    if (password.length < 8) {
      setProxyError('パスワードは8文字以上で入力してください')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setProxySaving(true)
    setProxyError('')
    try {
      const res = await fetch('/api/admin/vessels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(proxyForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setProxyError(data.error || '登録に失敗しました')
        return
      }
      setProxySuccess(true)
      setProxyForm(PROXY_FORM_INIT)
      // リストを再取得する
      await fetchVessels(session.access_token)
      setTimeout(() => setProxySuccess(false), 3000)
    } finally {
      setProxySaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  // サマリー集計
  const total = vessels.length
  const lockedCount = vessels.filter(v => v.status === 'locked').length
  const suspendedCount = vessels.filter(v => v.status === 'suspended').length

  // タブごとの表示データ
  const captainList = vessels
  const lockList = vessels.filter(v => v.status === 'locked' || v.status === 'suspended')

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#9CA3AF', fontSize: '14px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', minHeight: '100vh', background: '#111827', fontFamily: 'sans-serif' }}>

      {/* ヘッダー */}
      <div style={{ background: '#1F2937', borderBottom: '1px solid #374151', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ width: '32px', height: '32px', background: '#374151', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#F9FAFB' }}>fiShip 運営管理</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>管理者ダッシュボード</div>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, background: '#374151', color: '#9CA3AF', border: '1px solid #4B5563', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ログアウト
        </button>
      </div>

      <div style={{ padding: '14px' }}>

        {/* サマリーカード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: '登録船長数', value: total, bg: '#1F2937', border: '#374151', valueColor: '#F9FAFB' },
            { label: 'ロックあり', value: lockedCount, bg: '#7F1D1D', border: '#EF4444', valueColor: '#FCA5A5' },
            { label: '利用停止中', value: suspendedCount, bg: '#78350F', border: '#F59E0B', valueColor: '#FCD34D' },
          ].map(({ label, value, bg, border, valueColor }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: valueColor }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* タブバー */}
        <div style={{ display: 'flex', background: '#1F2937', borderRadius: '10px', padding: '3px', marginBottom: '14px', border: '1px solid #374151' }}>
          {([
            { key: 'captains' as const, label: '船長管理' },
            { key: 'proxy' as const, label: '代行登録' },
            { key: 'locks' as const, label: 'ロック管理' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '10px 4px', fontSize: '13px', fontWeight: 700,
                background: tab === t.key ? '#374151' : 'transparent',
                color: tab === t.key ? '#F9FAFB' : '#6B7280',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ===== 船長管理タブ ===== */}
        {tab === 'captains' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {captainList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                登録船長はいません
              </div>
            ) : captainList.map(v => (
              <CaptainCard
                key={v.id}
                vessel={v}
                expanded={expandedId === v.id}
                onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}

        {/* ===== 代行登録タブ ===== */}
        {tab === 'proxy' && (
          <div style={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#F9FAFB', marginBottom: '4px' }}>船長アカウントを代わりに登録する</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '18px' }}>登録したアカウント情報は船長に直接お伝えください</div>

            {proxySuccess && (
              <div style={{ background: '#064E3B', border: '1px solid #10B981', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: '#6EE7B7', textAlign: 'center' }}>
                代行登録が完了しました ✓
              </div>
            )}

            {proxyError && (
              <div style={{ background: '#7F1D1D', border: '1px solid #EF4444', borderRadius: '8px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#FCA5A5' }}>
                {proxyError}
              </div>
            )}

            {([
              { key: 'email', label: 'メールアドレス', placeholder: 'captain@example.com', type: 'email' },
              { key: 'password', label: '仮パスワード（8文字以上）', placeholder: '8文字以上で設定', type: 'password' },
              { key: 'name', label: '船の名前', placeholder: '例：海皇丸', type: 'text' },
              { key: 'captain_name', label: '船長名', placeholder: '例：山田 太郎', type: 'text' },
              { key: 'prefecture', label: '都道府県', placeholder: '例：福岡県', type: 'text' },
              { key: 'port_name', label: '漁港・出船場所', placeholder: '例：糸島市志摩野北漁港', type: 'text' },
            ] as const).map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '5px' }}>{label}</div>
                <input
                  type={type}
                  value={proxyForm[key as keyof typeof proxyForm] as string}
                  onChange={e => setProxyForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '12px', fontSize: '14px',
                    background: '#374151', border: '1px solid #4B5563', borderRadius: '8px',
                    color: '#F9FAFB', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '8px' }}>定員</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setProxyForm(p => ({ ...p, capacity: n }))}
                    style={{
                      flex: 1, padding: '10px', fontSize: '14px', fontWeight: 700,
                      background: proxyForm.capacity === n ? '#3B82F6' : '#374151',
                      color: proxyForm.capacity === n ? '#fff' : '#6B7280',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >{n}名</button>
                ))}
              </div>
            </div>

            <button
              onClick={handleProxyRegister}
              disabled={proxySaving}
              style={{
                width: '100%', padding: '15px', fontSize: '14px', fontWeight: 700,
                background: proxySaving ? '#374151' : '#3B82F6',
                color: proxySaving ? '#6B7280' : '#fff',
                border: 'none', borderRadius: '10px', cursor: proxySaving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {proxySaving ? '登録中...' : '代行登録する　→'}
            </button>
          </div>
        )}

        {/* ===== ロック管理タブ ===== */}
        {tab === 'locks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lockList.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                <div style={{ color: '#6B7280', fontSize: '14px' }}>ロック・利用停止中のアカウントはありません</div>
              </div>
            ) : lockList.map(v => (
              <CaptainCard
                key={v.id}
                vessel={v}
                expanded={expandedId === v.id}
                onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

// 船長カードコンポーネント（タップで操作メニューを展開）
function CaptainCard({
  vessel,
  expanded,
  onToggle,
  onAction,
  actionLoading,
}: {
  vessel: VesselWithStatus
  expanded: boolean
  onToggle: () => void
  onAction: (userId: string, action: string) => void
  actionLoading: string | null
}) {
  const cfg = STATUS_CONFIG[vessel.status]

  return (
    <div style={{
      background: '#1F2937', border: expanded ? '1px solid #3B82F6' : '1px solid #374151',
      borderRadius: '12px', overflow: 'hidden', transition: 'border-color .15s',
    }}>
      {/* カードヘッダー（タップ領域） */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
          background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        {/* 船アイコン */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
          background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
        }}>⚓</div>

        {/* 情報 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#F9FAFB' }}>{vessel.name}</span>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
              background: cfg.bg, color: cfg.color,
            }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            {vessel.captain_name} ・ {vessel.prefecture}{vessel.port_name}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
            {vessel.user_email} ・ 登録日 {formatDate(vessel.created_at)}
          </div>
        </div>

        {/* 展開矢印 */}
        <div style={{ color: '#6B7280', fontSize: '12px', flexShrink: 0, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
      </button>

      {/* アクションメニュー（展開時のみ表示） */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #374151' }}>
          <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vessel.status === 'active' || vessel.status === 'proxy' ? (
              <>
                <ActionButton
                  label="ロックする"
                  description="ログインを一時的に制限します"
                  color="#EF4444"
                  bg="#7F1D1D"
                  border="#EF4444"
                  loading={actionLoading === vessel.user_id + 'lock'}
                  onClick={() => onAction(vessel.user_id, 'lock')}
                />
                <ActionButton
                  label="利用停止にする"
                  description="アカウントを一時停止します"
                  color="#FCD34D"
                  bg="#78350F"
                  border="#F59E0B"
                  loading={actionLoading === vessel.user_id + 'suspend'}
                  onClick={() => onAction(vessel.user_id, 'suspend')}
                />
              </>
            ) : vessel.status === 'locked' ? (
              <ActionButton
                label="ロックを解除する"
                description="通常ログインを再開できるようにします"
                color="#6EE7B7"
                bg="#064E3B"
                border="#10B981"
                loading={actionLoading === vessel.user_id + 'unlock'}
                onClick={() => onAction(vessel.user_id, 'unlock')}
              />
            ) : vessel.status === 'suspended' ? (
              <ActionButton
                label="稼働中に戻す"
                description="利用停止を解除します"
                color="#6EE7B7"
                bg="#064E3B"
                border="#10B981"
                loading={actionLoading === vessel.user_id + 'activate'}
                onClick={() => onAction(vessel.user_id, 'activate')}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// アクションボタンコンポーネント
function ActionButton({
  label, description, color, bg, border, loading, onClick,
}: {
  label: string; description: string; color: string; bg: string; border: string;
  loading: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: loading ? '#374151' : bg,
        border: `1px solid ${loading ? '#4B5563' : border}`,
        borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: loading ? '#6B7280' : color }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{description}</div>
      </div>
      <span style={{ fontSize: '14px', color: loading ? '#6B7280' : color }}>{loading ? '...' : '→'}</span>
    </button>
  )
}
