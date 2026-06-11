'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CaptainHeader from '@/components/CaptainHeader'
import { supabase } from '@/lib/supabase'
import { calcRank, daysSince, getRankMeta, RANK_ORDER, type Rank } from '@/lib/customerRank'
import {
  LoadingScreen,
  PageShell,
  binLabel,
  cardStyle,
  colors,
  formatDate,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../../_components/CaptainShell'

type Customer = {
  id: string
  vessel_id: string
  name: string
  nickname: string | null
  tel: string
  captain_note: string | null
  manual_rank: string | null
}

type Booking = {
  id: string
  customer_id: string | null
  tel: string
  date: string
  bin_type: string
  fishing_style: string | null
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [vesselId, setVesselId] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [captainNote, setCaptainNote] = useState('')

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
      const [{ data: customerRow }, { data: bookingRows }] = await Promise.all([
        supabase
          .from('customers')
          .select('id, vessel_id, name, nickname, tel, captain_note, manual_rank')
          .eq('id', params.id)
          .eq('vessel_id', vessel.id)
          .single(),
        supabase
          .from('bookings')
          .select('id, customer_id, tel, date, bin_type, fishing_style')
          .eq('vessel_id', vessel.id)
          .eq('status', 'confirmed')
          .order('date', { ascending: false }),
      ])

      if (!customerRow) {
        router.replace('/dashboard/customers')
        return
      }

      const nextCustomer = customerRow as Customer
      setCustomer(nextCustomer)
      setName(nextCustomer.name)
      setNickname(nextCustomer.nickname || '')
      setCaptainNote(nextCustomer.captain_note || '')
      setBookings((bookingRows || []) as Booking[])
      setLoading(false)
    }

    init()
  }, [params.id, router])

  const history = useMemo(() => {
    if (!customer) return []
    return bookings.filter(booking =>
      (booking.customer_id && booking.customer_id === customer.id) ||
      (customer.tel && booking.tel === customer.tel),
    )
  }, [bookings, customer])

  const lastDate = history[0]?.date || ''
  const rank = calcRank(history.length, daysSince(lastDate), customer?.manual_rank || null)
  const rankMeta = getRankMeta(rank)
  const promotionRanks = RANK_ORDER.slice(0, RANK_ORDER.indexOf(rank))

  const saveProfile = async () => {
    if (!customer || !name.trim()) return
    setSaving(true)
    setMessage('')
    const payload = {
      captain_note: captainNote.trim() || null,
      name: name.trim(),
      nickname: nickname.trim() || null,
    }
    const { data, error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', customer.id)
      .eq('vessel_id', vesselId)
      .select('id, vessel_id, name, nickname, tel, captain_note, manual_rank')
      .single()

    if (error || !data) {
      setMessage('保存できませんでした。もう一度お試しください。')
    } else {
      setCustomer(data as Customer)
      setMessage('保存しました')
    }
    setSaving(false)
  }

  const promoteRank = async (nextRank: Rank) => {
    if (!customer || RANK_ORDER.indexOf(nextRank) >= RANK_ORDER.indexOf(rank)) return
    setMessage('')
    const { data, error } = await supabase
      .from('customers')
      .update({ manual_rank: nextRank })
      .eq('id', customer.id)
      .eq('vessel_id', vesselId)
      .select('id, vessel_id, name, nickname, tel, captain_note, manual_rank')
      .single()

    if (error || !data) {
      setMessage('ランクを更新できませんでした。')
      return
    }

    setCustomer(data as Customer)
    setMessage('ランクを更新しました')
  }

  if (loading || !customer) return <LoadingScreen />

  return (
    <PageShell title="顧客詳細" menu hero={<CaptainHeader vesselId={vesselId} />}>
      {message && (
        <div style={{
          ...cardStyle,
          background: message.includes('できません') ? '#FEF2F2' : colors.greenBg,
          color: message.includes('できません') ? '#B91C1C' : colors.green,
        }}>
          {message}
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ alignItems: 'center', display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <span style={{
            background: rankMeta.background,
            borderRadius: '3px',
            color: rankMeta.color,
            fontSize: '11px',
            fontWeight: 500,
            padding: '2px 8px',
          }}>
            {rankMeta.label}
          </span>
          {customer.manual_rank && (
            <span style={{ color: colors.sub, fontSize: '12px' }}>手動設定</span>
          )}
        </div>

        {promotionRanks.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ color: colors.sub, fontSize: '13px', marginBottom: '8px' }}>ランクを格上げ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {promotionRanks.map(nextRank => {
                const meta = getRankMeta(nextRank)
                return (
                  <button
                    key={nextRank}
                    onClick={() => promoteRank(nextRank)}
                    style={{
                      ...secondaryButtonStyle,
                      background: meta.background,
                      color: meta.color,
                      minWidth: '96px',
                    }}
                    type="button"
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'grid', gap: '14px' }}>
          <label>
            <span style={{ display: 'block', marginBottom: '6px' }}>氏名</span>
            <input onChange={event => setName(event.target.value)} style={inputStyle} value={name} />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: '6px' }}>あだ名</span>
            <input onChange={event => setNickname(event.target.value)} style={inputStyle} value={nickname} />
          </label>
          <div>
            <div style={{ marginBottom: '6px' }}>電話番号</div>
            <div style={{ alignItems: 'center', display: 'flex', gap: '10px' }}>
              <span style={{ color: colors.sub, flex: 1 }}>{customer.tel || '未登録'}</span>
              {customer.tel && (
                <button
                  onClick={() => { window.location.href = `tel:${customer.tel}` }}
                  style={{ ...primaryButtonStyle, minHeight: '48px', width: '96px' }}
                  type="button"
                >
                  電話する
                </button>
              )}
            </div>
          </div>
          <label>
            <span style={{ display: 'block', marginBottom: '6px' }}>船長メモ</span>
            <textarea
              onChange={event => setCaptainNote(event.target.value)}
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              value={captainNote}
            />
          </label>
          <button
            disabled={saving}
            onClick={saveProfile}
            style={{ ...primaryButtonStyle, width: '100%' }}
            type="button"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 10px' }}>乗船履歴</h2>
        {history.length === 0 && <div style={{ color: colors.sub }}>履歴はありません。</div>}
        {history.map(booking => (
          <div
            key={booking.id}
            style={{ borderTop: `0.5px solid ${colors.border}`, padding: '12px 0' }}
          >
            {formatDate(booking.date)} ・ {binLabel(booking.bin_type)} ・ {booking.fishing_style || '釣り方未登録'}
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/dashboard/customers')}
        style={{ ...secondaryButtonStyle, width: '100%' }}
        type="button"
      >
        一覧へ戻る
      </button>
    </PageShell>
  )
}
