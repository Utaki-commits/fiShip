'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

type Vessel = {
  id: string
  name: string
  captain_name: string
  logo_url: string | null
  banner_url: string | null
}

type Booking = {
  id: string
  date: string
  bin_type: 'day' | 'night' | 'relay'
  name: string
  tel: string
  count: number
  fishing_style: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  channel: string | null
  contacted: boolean | null
}

type BinSetting = {
  id: string
  bin_type: 'day' | 'night' | 'relay'
  max_capacity: number
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const formatDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日（${DAY_NAMES[date.getDay()]}）`
}

const binLabel = (binType: Booking['bin_type']) => {
  if (binType === 'day') return '昼便'
  if (binType === 'relay') return '昼夜便'
  return '夜便'
}

const binBadgeClass = (binType: Booking['bin_type']) => {
  if (binType === 'day') return 'bg-[#DBEAFE] text-[#1E3A8A]'
  if (binType === 'relay') return 'bg-[#FEF2F2] text-[#B91C1C]'
  return 'bg-[#EDE9FE] text-[#5B21B6]'
}

const statusLabel = (status: Booking['status']) => {
  if (status === 'confirmed') return '確定'
  if (status === 'cancelled') return '取消済み'
  if (status === 'rejected') return 'お断り'
  return '承認待ち'
}

const statusClass = (status: Booking['status']) => {
  if (status === 'confirmed') return 'text-[#059669] bg-[#ECFDF5]'
  if (status === 'pending') return 'text-[#D97706] bg-[#FFFBEB]'
  return 'text-[#57534E] bg-[#F5F5F4]'
}

const channelLabel = (channel: string | null) => {
  const labels: Record<string, string> = {
    page: '予約ページ',
    line: 'LINE',
    line_official: 'LINE公式',
    instagram: 'Instagram',
    phone: '電話',
    other: 'その他',
  }
  return labels[channel || 'other'] || labels.other
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white ${className}`}>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [binSettings, setBinSettings] = useState<BinSetting[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null)
  const [deleting, setDeleting] = useState(false)

  const today = useMemo(() => new Date(), [])
  const tomorrow = useMemo(() => new Date(Date.now() + 86400000), [])
  const todayStr = toDateStr(today)
  const tomorrowStr = toDateStr(tomorrow)

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      if (!res.ok) {
        router.push('/login')
        return
      }

      const user = await res.json()
      if (!user?.sub) {
        router.push('/login')
        return
      }

      const { data: vesselData } = await supabase
        .from('vessels')
        .select('*')
        .eq('user_id', user.sub)
        .single()

      if (!vesselData) {
        router.push('/register')
        return
      }

      setVessel(vesselData)

      const [{ data: bookingRows }, { data: settingRows }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('vessel_id', vesselData.id)
          .gte('date', todayStr)
          .order('date', { ascending: true }),
        supabase
          .from('bin_settings')
          .select('id, bin_type, max_capacity')
          .eq('vessel_id', vesselData.id),
      ])

      setBookings(bookingRows || [])
      setBinSettings(settingRows || [])
      setLoading(false)
    }

    init()
  }, [router, todayStr])

  const updateStatus = async (id: string, status: 'confirmed' | 'rejected') => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setBookings(prev => prev.map(booking => booking.id === id ? { ...booking, status } : booking))
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleCall = async (booking: Booking) => {
    window.location.href = `tel:${booking.tel}`
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, contacted: true }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(item => item.id === booking.id ? { ...item, contacted: true } : item))
    }
  }

  const toggleContacted = async (booking: Booking) => {
    const contacted = !booking.contacted
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, contacted }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(item => item.id === booking.id ? { ...item, contacted } : item))
    }
  }

  const handleCancel = async (booking: Booking) => {
    const res = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, status: 'cancelled' }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(item => item.id === booking.id ? { ...item, status: 'cancelled' } : item))
    }
  }

  const handleDelete = async (booking: Booking, addBlockedDate: boolean) => {
    if (!vessel?.id) return
    setDeleting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id }),
      })
      if (!res.ok) return

      setBookings(prev => prev.filter(item => item.id !== booking.id))

      if (addBlockedDate) {
        await supabase.from('blocked_dates').insert([{
          vessel_id: vessel.id,
          date_from: booking.date,
          date_to: booking.date,
          bin_type: null,
          type: 'other',
          reason: '出船中止',
        }])
      }
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const pendingBookings = bookings.filter(booking => booking.status === 'pending')
  const todayBookings = bookings.filter(booking => booking.date === todayStr && booking.status !== 'rejected')
  const tomorrowBookings = bookings.filter(booking => booking.date === tomorrowStr && booking.status !== 'rejected')
  const tomorrowUncontacted = tomorrowBookings.filter(booking => booking.status === 'confirmed' && !booking.contacted)

  const getMaxCapacity = (binType: Booking['bin_type']) =>
    binSettings.find(setting => setting.bin_type === binType)?.max_capacity || 0

  const quickActions = [
    { label: '予約一覧', path: '/dashboard/bookings' },
    { label: '顧客名簿', path: '/dashboard/customers' },
    { label: '乗船名簿', path: '/dashboard/logs' },
    { label: 'スケジュール', path: '/dashboard/schedule' },
  ]

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className={`p-4 ${booking.status === 'confirmed' && !booking.contacted ? 'bg-[#FFF7ED]' : ''}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-[20px] px-3 py-1 text-[13px] font-medium ${binBadgeClass(booking.bin_type)}`}>
          {binLabel(booking.bin_type)}
        </span>
        <span className="rounded-[20px] bg-[#F5F5F4] px-3 py-1 text-[13px] font-normal text-[#57534E]">
          {channelLabel(booking.channel)}
        </span>
        <span className={`ml-auto rounded-[20px] px-3 py-1 text-[13px] font-medium ${statusClass(booking.status)}`}>
          {statusLabel(booking.status)}
        </span>
      </div>

      <div className="mb-2 text-[22px] font-medium leading-tight text-[#1C1917]">
        {booking.name}<span className="ml-1 text-[15px] font-normal text-[#57534E]">様</span>
      </div>
      <div className="mb-3 text-[15px] font-normal text-[#57534E]">
        {booking.count}名
        {booking.fishing_style ? `・${booking.fishing_style}` : ''}
        {booking.message ? `・${booking.message}` : ''}
      </div>

      {booking.status === 'confirmed' && (
        <div className="mb-3 flex items-center gap-2 text-[14px] font-medium">
          <span className={`h-2 w-2 rounded-full ${booking.contacted ? 'bg-[#059669]' : 'bg-[#D97706]'}`} />
          <span className={booking.contacted ? 'text-[#059669]' : 'text-[#D97706]'}>
            {booking.contacted ? '連絡済み' : '未連絡'}
          </span>
          {!booking.contacted && <span className="font-normal text-[#57534E]">電話確認をお願いします</span>}
        </div>
      )}

      {booking.status === 'pending' && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => updateStatus(booking.id, 'confirmed')}
            disabled={actionLoading === booking.id}
            className="min-h-0 rounded-[9px] border-[0.5px] border-[#A7F3D0] bg-[#ECFDF5] px-3 py-3 text-[15px] font-medium text-[#059669] disabled:opacity-60"
          >
            {actionLoading === booking.id ? '処理中' : '承認する'}
          </button>
          <button
            onClick={() => updateStatus(booking.id, 'rejected')}
            disabled={actionLoading === booking.id}
            className="min-h-0 rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] px-3 py-3 text-[15px] font-medium text-[#B91C1C] disabled:opacity-60"
          >
            お断り
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {booking.status === 'confirmed' && booking.tel && (
          <button
            onClick={() => handleCall(booking)}
            className="min-h-0 rounded-[9px] bg-[#B91C1C] px-5 py-3 text-[15px] font-medium text-white"
          >
            TELする
          </button>
        )}
        {booking.status === 'confirmed' && (
          <button
            onClick={() => toggleContacted(booking)}
            className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-4 py-3 text-[14px] font-medium text-[#57534E]"
          >
            {booking.contacted ? '未連絡に戻す' : '連絡済みにする'}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          {booking.status !== 'cancelled' && (
            <button
              onClick={() => router.push('/dashboard/bookings')}
              className="min-h-0 rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[14px] font-medium text-[#B91C1C]"
            >
              編集
            </button>
          )}
          {booking.status === 'confirmed' && (
            <button
              onClick={() => handleCancel(booking)}
              className="min-h-0 rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-transparent px-4 py-3 text-[14px] font-medium text-[#B91C1C]"
            >
              取消
            </button>
          )}
          <button
            onClick={() => setDeleteTarget(booking)}
            className="min-h-0 rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-transparent px-4 py-3 text-[14px] font-medium text-[#B91C1C]"
          >
            削除
          </button>
        </div>
      </div>
    </Card>
  )

  const DaySection = ({ label, dateBookings }: { label: string; dateBookings: Booking[] }) => {
    const byBin = (binType: Booking['bin_type']) => dateBookings.filter(booking => booking.bin_type === binType)
    const groups = [
      { binType: 'day' as const, items: byBin('day') },
      { binType: 'relay' as const, items: byBin('relay') },
      { binType: 'night' as const, items: byBin('night') },
    ].filter(group => group.items.length > 0)

    return (
      <Card className="mb-3 p-4">
        <div className="mb-3 text-[20px] font-medium text-[#1C1917]">{label}</div>
        {dateBookings.length === 0 ? (
          <div className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-[#F7F2EF] p-4 text-[15px] font-normal text-[#57534E]">
            予約はありません
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <div key={group.binType}>
                <div className="mb-2 flex items-center gap-2 text-[15px] font-medium text-[#1C1917]">
                  <span className={`rounded-[20px] px-3 py-1 text-[13px] ${binBadgeClass(group.binType)}`}>
                    {binLabel(group.binType)}
                  </span>
                  <span className="font-normal text-[#57534E]">
                    {group.items.reduce((sum, booking) => sum + booking.count, 0)}名 / {getMaxCapacity(group.binType)}名
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(booking => <BookingCard key={booking.id} booking={booking} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#7F1D1D] text-[16px] font-normal text-white">
        読み込み中...
      </main>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F7F2EF] font-sans">
      <header className="sticky top-0 z-20 overflow-hidden bg-[#7F1D1D] px-5 py-5 text-white">
        <div className="asahi-rays" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
        </div>
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[12px] border-[0.5px] border-white/30 bg-white">
            <img
              src={vessel?.logo_url || DEFAULT_ICON}
              alt={`${vessel?.name || 'fiShip'} ロゴ`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[24px] font-medium leading-tight text-white">{vessel?.name}</div>
            <div className="mt-1 truncate text-[16px] font-normal text-white/85">{vessel?.captain_name}</div>
          </div>
          {pendingBookings.length > 0 && (
            <div className="rounded-[20px] border-[0.5px] border-white/40 bg-white/10 px-3 py-2 text-[13px] font-medium text-white">
              承認待ち {pendingBookings.length}件
            </div>
          )}
          <button
            onClick={() => router.push('/dashboard/account')}
            aria-label="設定を開く"
            className="min-h-0 h-12 rounded-[9px] border-[0.5px] border-white/40 bg-white/10 px-4 text-[14px] font-medium text-white"
          >
            設定
          </button>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4">
        {pendingBookings.length > 0 && (
          <section>
            <div className="mb-2 text-[18px] font-medium text-[#1C1917]">新しい予約</div>
            <div className="space-y-2">
              {pendingBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}
            </div>
          </section>
        )}

        {tomorrowBookings.length > 0 && (
          <Card className={`p-4 ${tomorrowUncontacted.length > 0 ? 'bg-[#FFF7ED]' : 'bg-[#ECFDF5]'}`}>
            <div className={`text-[16px] font-medium ${tomorrowUncontacted.length > 0 ? 'text-[#D97706]' : 'text-[#059669]'}`}>
              {tomorrowUncontacted.length > 0
                ? `明日の予約で未連絡が${tomorrowUncontacted.length}件あります`
                : '明日の予約は連絡済みです'}
            </div>
          </Card>
        )}

        <DaySection label={`今日 ${formatDate(todayStr)}`} dateBookings={todayBookings} />
        <DaySection label={`明日 ${formatDate(tomorrowStr)}`} dateBookings={tomorrowBookings} />

        <div className="grid grid-cols-2 gap-2">
          {quickActions.map(action => (
            <button
              key={action.path}
              onClick={() => router.push(action.path)}
              className="min-h-[64px] rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-4 text-[16px] font-medium text-[#1C1917]"
            >
              {action.label}
            </button>
          ))}
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5">
          <Card className="w-full max-w-[440px] p-5">
            <div className="mb-2 text-[20px] font-medium text-[#1C1917]">予約を削除しますか？</div>
            <div className="mb-4 text-[15px] font-normal leading-7 text-[#57534E]">
              {deleteTarget.name}さん {formatDate(deleteTarget.date)} {binLabel(deleteTarget.bin_type)}
            </div>
            <div className="mb-4 rounded-[12px] border-[0.5px] border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[14px] font-normal leading-6 text-[#B91C1C]">
              出船を中止する場合は、この日を休船日に設定できます。
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleDelete(deleteTarget, true)}
                disabled={deleting}
                className="min-h-[56px] w-full rounded-[9px] bg-[#B91C1C] px-4 py-3 text-[15px] font-medium text-white disabled:opacity-60"
              >
                削除して休船日にする
              </button>
              <button
                onClick={() => handleDelete(deleteTarget, false)}
                disabled={deleting}
                className="min-h-[56px] w-full rounded-[9px] border-[0.5px] border-[#FCA5A5] bg-transparent px-4 py-3 text-[15px] font-medium text-[#B91C1C] disabled:opacity-60"
              >
                削除のみ
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="min-h-[56px] w-full rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-3 text-[15px] font-medium text-[#57534E]"
              >
                キャンセル
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
