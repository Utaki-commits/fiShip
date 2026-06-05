'use client'

import type { ReactNode } from 'react'
import CaptainBottomNav from '@/components/CaptainBottomNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ paddingBottom: '56px' }}>
      {children}
      <CaptainBottomNav />
    </div>
  )
}
