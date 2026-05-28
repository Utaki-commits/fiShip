'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CaptainButton, CaptainCard } from '@/components/captain-ui'
import styles from './CaptainShell.module.css'

export const colors = {
  header: '#1B2A4A',
  action: '#1E4D3A',
  page: '#F4F6F2',
  card: '#FFFFFF',
  border: '#CDD3DC',
  text: '#1A2420',
  sub: '#5A6A78',
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
  paddingBottom: '0',
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
  color: '#B91C1C',
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
  color: '#1E4D3A',
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
    <main className={`${styles.page} ${styles.loadingPage}`}>
      <CaptainCard className={styles.loadingCard}>読み込み中...</CaptainCard>
    </main>
  )
}

const menuItems = [
  { label: '顧客名簿', href: '/dashboard/customers' },
  { label: '便設定', href: '/dashboard/bins' },
  { label: '休船日', href: '/dashboard/blocked-dates' },
  { label: '船情報', href: '/dashboard/vessel' },
  { label: '設定', href: '/dashboard/account' },
]

export function PageShell({ title, children, menu = false, back = false }: { title: string; children: ReactNode; menu?: boolean; back?: boolean }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          {back && (
            <CaptainButton
              aria-label="戻る"
              className={styles.headerButton}
              onClick={() => router.push('/dashboard')}
              size="md"
              variant="secondary"
            >←</CaptainButton>
          )}
          <h1 className={styles.headerTitle}>{title}</h1>
          {menu && (
            <CaptainButton
              aria-label="メニュー"
              className={styles.headerButton}
              onClick={() => setMenuOpen(true)}
              size="md"
              variant="secondary"
            >≡</CaptainButton>
          )}
        </div>
      </header>
      <main className={styles.content}>{children}</main>
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>メニュー</div>
              <CaptainButton className={styles.drawerClose} onClick={() => setMenuOpen(false)} size="sm" variant="secondary">閉じる</CaptainButton>
            </div>
            <div className={styles.drawerList}>
              {menuItems.map(item => (
                <CaptainButton className={styles.drawerItem} key={item.href} onClick={() => { setMenuOpen(false); router.push(item.href) }} variant="secondary">
                  {item.label}
                </CaptainButton>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function StatusPill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'gray'; children: ReactNode }) {
  return <span className={`${styles.statusPill} ${styles[tone]}`}>{children}</span>
}
