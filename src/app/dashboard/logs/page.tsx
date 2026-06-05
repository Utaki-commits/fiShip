'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CaptainHeader from '@/components/CaptainHeader'
import { PageShell, LoadingScreen, cardStyle, colors, primaryButtonStyle, secondaryButtonStyle, inputStyle, StatusPill, binLabel, formatDate, toDateStr } from '../_components/CaptainShell'

type Booking = { id: string; vessel_id: string; date: string; bin_type: string; name: string; tel: string; count: number; board_token: string | null; board_completed: boolean; board_completed_at: string | null; status: string }
type PassengerLog = { id: string; booking_id: string | null; date: string; name: string; tel: string; count: number; address: string | null; emergency_contact: string | null; image_url: string | null }

export default function LogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [logs, setLogs] = useState<PassengerLog[]>([])
  const [date, setDate] = useState(toDateStr(new Date()))
  const [imageName, setImageName] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase.from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      const [{ data: bk }, { data: lg }] = await Promise.all([
        supabase.from('bookings').select('*').eq('vessel_id', vessel.id).eq('status', 'confirmed').order('date', { ascending: false }),
        supabase.from('passenger_logs').select('*').eq('vessel_id', vessel.id).order('date', { ascending: false }),
      ])
      setBookings((bk || []) as Booking[])
      setLogs((lg || []) as PassengerLog[])
      setLoading(false)
    }
    init()
  }, [router])

  const todays = bookings.filter(b => b.date === date)
  const pastDates = useMemo(() => Array.from(new Set(logs.map(l => l.date))).slice(0, 14), [logs])

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageName(file.name)
    setNotice('画像を受け付けました。OCR解析は次の処理で反映されます。')
    setTimeout(() => setNotice(''), 2500)
  }

  if (loading) return <LoadingScreen />

  return (
    <PageShell title="乗船名簿" menu hero={<CaptainHeader vesselId={vesselId} />}>
      {notice && <div style={{ ...cardStyle, background: colors.greenBg, color: colors.green }}>{notice}</div>}
      <div style={cardStyle}>
        <label>確認する日付</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, margin: '8px 0 12px' }} />
        <label htmlFor="ocr-image" style={{ ...primaryButtonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>紙の名簿を撮影して取り込む</label>
        <input id="ocr-image" type="file" accept="image/*" capture="environment" onChange={handleImage} style={{ display: 'none' }} />
        {imageName && <div style={{ color: colors.sub, marginTop: '8px' }}>選択中: {imageName}</div>}
      </div>

      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '18px 0 10px' }}>{formatDate(date)}の名簿</h2>
        {todays.length === 0 && <div style={cardStyle}>この日の確定予約はありません。</div>}
        {todays.map(booking => {
          const log = logs.find(l => l.booking_id === booking.id)
          return (
            <div key={booking.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: 500 }}>{booking.name} 様</span>
                <span style={{ color: colors.sub }}>{booking.count}名 / {binLabel(booking.bin_type)}</span>
                {booking.board_completed || log ? <StatusPill tone="green">記入済み</StatusPill> : booking.board_token ? <StatusPill tone="amber">未記入</StatusPill> : <StatusPill tone="gray">SMS未送信</StatusPill>}
              </div>
              {log && <div style={{ color: colors.sub, marginTop: '8px', lineHeight: 1.7 }}>住所: {log.address || '未入力'}<br />緊急連絡先: {log.emergency_contact || '未入力'}</div>}
            </div>
          )
        })}
      </section>

      <section>
        <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '18px 0 10px' }}>過去の名簿</h2>
        {pastDates.length === 0 && <div style={cardStyle}>過去の名簿はありません。</div>}
        {pastDates.map(d => <button key={d} onClick={() => setDate(d)} style={{ ...cardStyle, width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{formatDate(d)} の名簿を確認</button>)}
        {vesselId && <button onClick={() => window.print()} style={{ ...secondaryButtonStyle, width: '100%', marginTop: '8px' }}>印刷する</button>}
      </section>
    </PageShell>
  )
}
