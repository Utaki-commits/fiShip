'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export const colors = {
  header: '#7F1D1D',
  action: '#B91C1C',
  page: '#F7F2EF',
  card: '#FFFFFF',
  border: '#E8DDD8',
  text: '#1C1917',
  sub: '#57534E',
  weak: '#9CA3AF',
  amberBg: '#FEF3C7',
  amber: '#D97706',
  amberBorder: '#F59E0B',
  redBg: '#FEF2F2',
  redBorder: '#FCA5A5',
  greenBg: '#ECFDF5',
  green: '#059669',
  dayBg: '#DBEAFE',
  day: '#1E3A8A',
  nightBg: '#EDE9FE',
  night: '#5B21B6',
}

export const pageStyle: CSSProperties = {
  maxWidth: '480px',
  margin: '0 auto',
  minHeight: '100vh',
  background: colors.page,
  color: colors.text,
  fontFamily: 'var(--font-sans)',
  paddingBottom: '92px',
}

export const cardStyle: CSSProperties = {
  background: colors.card,
  border: `0.5px solid ${colors.border}`,
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
}

export const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px',
  fontSize: '16px',
  color: colors.text,
  background: colors.card,
  border: `0.5px solid ${colors.border}`,
  borderRadius: '8px',
  fontFamily: 'inherit',
}

export const primaryButtonStyle: CSSProperties = {
  minHeight: '56px',
  padding: '14px 16px',
  border: 'none',
  borderRadius: '9px',
  background: colors.action,
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

export const secondaryButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '12px 14px',
  border: `0.5px solid ${colors.border}`,
  borderRadius: '9px',
  background: 'transparent',
  color: colors.sub,
  fontSize: '15px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

export const dangerButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '12px 14px',
  border: `0.5px solid ${colors.redBorder}`,
  borderRadius: '9px',
  background: 'transparent',
  color: colors.action,
  fontSize: '15px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

export const editButtonStyle: CSSProperties = {
  minHeight: '48px',
  padding: '12px 14px',
  border: `0.5px solid ${colors.redBorder}`,
  borderRadius: '9px',
  background: colors.redBg,
  color: colors.action,
  fontSize: '15px',
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return `${date.getMonth() + 1}月${date.getDate()}日（${DAY_NAMES[date.getDay()]}）`
}

export const binLabel = (binType: string) => {
  if (binType === 'day') return '昼便'
  if (binType === 'night') return '夜便'
  if (binType === 'relay') return '昼夜便'
  return binType || '便未定'
}

export const binBadgeStyle = (binType: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '28px',
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 500,
  background: binType === 'night' ? colors.nightBg : binType === 'relay' ? '#FCE7F3' : colors.dayBg,
  color: binType === 'night' ? colors.night : binType === 'relay' ? colors.action : colors.day,
})

export function LoadingScreen() {
  return (
    <main style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ ...cardStyle, fontSize: '16px', color: colors.sub }}>読み込み中...</div>
    </main>
  )
}

export function PageShell({ title, children, menu = true }: { title: string; children: ReactNode; menu?: boolean }) {
  const router = useRouter()
  return (
    <div style={pageStyle}>
      <header style={{ background: colors.header, color: '#FFFFFF', padding: '18px 18px 16px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ ...secondaryButtonStyle, minWidth: '52px', minHeight: '52px', color: '#FFFFFF', border: '0.5px solid rgba(255,255,255,0.35)' }}
          >戻る</button>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 500, lineHeight: 1.3, flex: 1 }}>{title}</h1>
          {menu && (
            <button
              onClick={() => router.push('/dashboard/account')}
              style={{ ...secondaryButtonStyle, minWidth: '52px', minHeight: '52px', color: '#FFFFFF', border: '0.5px solid rgba(255,255,255,0.35)' }}
            >設定</button>
          )}
        </div>
      </header>
      <main style={{ padding: '16px' }}>{children}</main>
      <nav style={{ position: 'fixed', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: colors.card, borderTop: `0.5px solid ${colors.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', zIndex: 40 }}>
        {[
          { label: 'ホーム', path: '/dashboard' },
          { label: '予約', path: '/dashboard/bookings' },
          { label: '名簿', path: '/dashboard/logs' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{ minHeight: '64px', border: 'none', background: 'transparent', color: colors.text, fontSize: '15px', fontWeight: 500, fontFamily: 'inherit' }}>{item.label}</button>
        ))}
      </nav>
    </div>
  )
}

export function StatusPill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'gray'; children: ReactNode }) {
  const style = tone === 'green'
    ? { background: colors.greenBg, color: colors.green }
    : tone === 'amber'
      ? { background: colors.amberBg, color: colors.amber }
      : tone === 'red'
        ? { background: colors.redBg, color: colors.action }
        : { background: '#F5F5F5', color: colors.weak }
  return <span style={{ ...style, borderRadius: '20px', padding: '4px 10px', fontSize: '13px', fontWeight: 500 }}>{children}</span>
}
