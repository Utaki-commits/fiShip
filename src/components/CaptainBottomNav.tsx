'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const activeColor = '#D4AC0D'

const navItems = [
  { label: '🏠 ホーム', href: '/dashboard', matchPaths: ['/dashboard'] },
  { label: '📋 出船予定', href: '/dashboard/schedule', matchPaths: ['/dashboard/schedule', '/dashboard/bins'] },
  { label: '📒 名簿', href: '/dashboard/extract', matchPaths: ['/dashboard/extract', '/dashboard/logs'] },
  { label: '📞 予約登録', href: '/dashboard/bookings', matchPaths: ['/dashboard/bookings'] },
]

export default function CaptainBottomNav() {
  const pathname = usePathname()
  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: '#1B2A4A',
        borderTop: '0.5px solid rgba(255,255,255,0.2)',
        zIndex: 50,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
      }}
    >
      {navItems.map(item => {
        const active = item.matchPaths.some(path => isActive(path))
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              position: 'relative',
              minHeight: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: active ? activeColor : 'rgba(255,255,255,0.58)',
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'var(--font-sans)',
              borderBottom: active ? `2px solid ${activeColor}` : '2px solid transparent',
            }}
          >
            {active && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '28px',
                  height: '3px',
                  borderRadius: '0 0 3px 3px',
                  background: activeColor,
                }}
              />
            )}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
