'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const navItems = [
  { label: 'ホーム', href: '/dashboard' },
  { label: '予約', href: '/dashboard/bookings' },
  { label: '名簿', href: '/dashboard/logs' },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ paddingBottom: '56px' }}>
      {children}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: '#7F1D1D',
          borderTop: '0.5px solid rgba(255,255,255,0.2)',
          zIndex: 50,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}
      >
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                minHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                opacity: active ? 1 : 0.58,
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
