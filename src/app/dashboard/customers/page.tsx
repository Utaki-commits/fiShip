'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CaptainHeader from '@/components/CaptainHeader'
import { supabase } from '@/lib/supabase'
import { calcRank, daysSince, getRankMeta, type Rank } from '@/lib/customerRank'
import { LoadingScreen, PageShell, cardStyle, colors, formatDate, inputStyle } from '../_components/CaptainShell'

type Customer = {
  id: string
  vessel_id: string
  name: string
  nickname: string | null
  tel: string
  is_blacklisted: boolean
  manual_rank: string | null
}

type Booking = {
  id: string
  customer_id: string | null
  tel: string
  date: string
}

type CustomerWithStats = Customer & {
  visits: number
  lastDate: string
  rank: Rank
}

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vesselId, setVesselId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: vessel } = await supabase
        .from('vessels')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!vessel) {
        router.push('/register')
        return
      }

      setVesselId(vessel.id)
      const [{ data: customerRows }, { data: bookingRows }] = await Promise.all([
        supabase
          .from('customers')
          .select('id, vessel_id, name, nickname, tel, is_blacklisted, manual_rank')
          .eq('vessel_id', vessel.id)
          .order('name'),
        supabase
          .from('bookings')
          .select('id, customer_id, tel, date')
          .eq('vessel_id', vessel.id)
          .eq('status', 'confirmed')
          .order('date', { ascending: false }),
      ])

      setCustomers((customerRows || []) as Customer[])
      setBookings((bookingRows || []) as Booking[])
      setLoading(false)
    }

    init()
  }, [router])

  const customersWithStats = useMemo<CustomerWithStats[]>(() => customers.map(customer => {
    const history = bookings.filter(booking =>
      (booking.customer_id && booking.customer_id === customer.id) ||
      (customer.tel && booking.tel === customer.tel),
    )
    const lastDate = history[0]?.date || ''
    return {
      ...customer,
      visits: history.length,
      lastDate,
      rank: calcRank(history.length, daysSince(lastDate), customer.manual_rank),
    }
  }).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || '')), [bookings, customers])

  const filteredCustomers = customersWithStats.filter(customer =>
    `${customer.name} ${customer.nickname || ''} ${customer.tel}`.includes(search),
  )

  if (loading) return <LoadingScreen />

  return (
    <PageShell title="顧客名簿" menu hero={<CaptainHeader vesselId={vesselId} />}>
      <div style={cardStyle}>
        <label htmlFor="customer-search">検索</label>
        <input
          id="customer-search"
          onChange={event => setSearch(event.target.value)}
          placeholder="名前・あだ名・電話番号"
          style={{ ...inputStyle, marginTop: '8px' }}
          value={search}
        />
      </div>

      {filteredCustomers.length === 0 && <div style={cardStyle}>顧客情報はまだありません。</div>}

      {filteredCustomers.map(customer => {
        const rankMeta = getRankMeta(customer.rank)
        return (
          <div
            key={customer.id}
            onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                router.push(`/dashboard/customers/${customer.id}`)
              }
            }}
            role="button"
            style={{ ...cardStyle, cursor: 'pointer' }}
            tabIndex={0}
          >
            <span style={{
              background: rankMeta.background,
              borderRadius: '3px',
              color: rankMeta.color,
              display: 'inline-flex',
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
            }}>
              {rankMeta.label}
            </span>

            <div style={{ alignItems: 'center', display: 'flex', gap: '12px', marginTop: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>
                  {customer.name} 様{customer.nickname ? `（${customer.nickname}）` : ''}
                </div>
                <div style={{ color: colors.sub, fontSize: '15px', marginTop: '4px' }}>
                  {customer.tel || '電話未登録'}
                </div>
                <div style={{ color: colors.sub, fontSize: '13px', marginTop: '6px' }}>
                  来船 {customer.visits}回
                  {customer.lastDate ? ` ・ 最終 ${formatDate(customer.lastDate)}` : ''}
                </div>
              </div>

              {customer.tel && (
                <button
                  onClick={event => {
                    event.stopPropagation()
                    window.location.href = `tel:${customer.tel}`
                  }}
                  style={{
                    background: colors.action,
                    border: 'none',
                    borderRadius: '9px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 500,
                    minHeight: '48px',
                    width: '96px',
                  }}
                  type="button"
                >
                  電話する
                </button>
              )}
            </div>
          </div>
        )
      })}
    </PageShell>
  )
}
