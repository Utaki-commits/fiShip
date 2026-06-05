'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  vesselId: string
}

type VesselHeader = {
  name: string | null
  banner_url: string | null
  captain_name: string | null
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const formatDate = (date: Date) =>
  `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${DAY_NAMES[date.getDay()]}）`

export default function CaptainHeader({ vesselId }: Props) {
  const [vessel, setVessel] = useState<VesselHeader | null>(null)
  const today = useMemo(() => new Date(), [])

  useEffect(() => {
    const load = async () => {
      if (!vesselId) return
      const { data } = await supabase
        .from('vessels')
        .select('name, banner_url, captain_name')
        .eq('id', vesselId)
        .single()
      setVessel((data || null) as VesselHeader | null)
    }
    load()
  }, [vesselId])

  return (
    <div style={{ background: '#1b2a4a', minHeight: '120px', position: 'relative' }}>
      {vessel?.banner_url && (
        <img
          src={vessel.banner_url}
          alt={`${vessel.name || '船'} バナー`}
          style={{
            display: 'block',
            height: '120px',
            objectFit: 'cover',
            objectPosition: 'right center',
            opacity: 0.62,
            width: '100%',
          }}
        />
      )}
      <div
        style={{
          alignItems: 'flex-end',
          background: 'linear-gradient(90deg, rgba(27, 42, 74, 0.96) 0%, rgba(27, 42, 74, 0.78) 48%, rgba(27, 42, 74, 0.18) 100%)',
          bottom: 0,
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
          left: 0,
          padding: '18px 16px',
          position: 'absolute',
          right: 0,
        }}
      >
        <div style={{ maxWidth: '70%' }}>
          <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: 500, lineHeight: 1.3 }}>
            {vessel?.name || 'ダッシュボード'}
          </div>
          <div
            style={{
              borderBottom: '0.5px solid rgba(255, 255, 255, 0.58)',
              color: 'rgba(255, 255, 255, 0.85)',
              display: 'inline-flex',
              fontSize: '13px',
              lineHeight: 1.4,
              marginTop: '6px',
              paddingBottom: '3px',
            }}
          >
            ⚓ 船長 {vessel?.captain_name || '未設定'}
          </div>
          <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500, lineHeight: 1.4, marginTop: '10px' }}>
            {formatDate(today)}
          </div>
        </div>
      </div>
    </div>
  )
}
