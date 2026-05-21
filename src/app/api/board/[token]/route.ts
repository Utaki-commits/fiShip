import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type RouteContext = { params: Promise<{ token: string }> }

// GET: トークンで予約情報と既存顧客情報を取得する
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, vessels(id, name, captain_name)')
    .eq('board_token', token)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
  }

  // 乗船日翌日23:59まで有効
  const bookingDate = new Date(booking.date + 'T00:00:00')
  const expiry = new Date(bookingDate)
  expiry.setDate(expiry.getDate() + 1)
  expiry.setHours(23, 59, 59)

  if (new Date() > expiry) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  // 同じ電話番号の既存顧客情報を確認（2回目以降の判定）
  let existingCustomer = null
  if (booking.tel && booking.vessels?.id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, address, age, gender, emergency_contact, emergency_contact_relation')
      .eq('vessel_id', booking.vessels.id)
      .eq('tel', booking.tel)
      .maybeSingle()
    existingCustomer = customer
  }

  return NextResponse.json({ booking, existingCustomer })
}

// POST: 乗船名簿記入・同意を処理する
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*, vessels(id, name)')
    .eq('board_token', token)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
  }

  // 有効期限チェック
  const bookingDate = new Date(booking.date + 'T00:00:00')
  const expiry = new Date(bookingDate)
  expiry.setDate(expiry.getDate() + 1)
  expiry.setHours(23, 59, 59)

  if (new Date() > expiry) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const { address, age, gender, emergency_contact, emergency_contact_relation } = await req.json()

  if (!address || !age || !emergency_contact) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const vesselId = booking.vessels?.id

  // 既存顧客を確認して情報変更を検知する
  let customerId: string | null = null
  let customerChanged = false

  if (vesselId && booking.tel) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id, address, emergency_contact, name')
      .eq('vessel_id', vesselId)
      .eq('tel', booking.tel)
      .maybeSingle()

    if (existing) {
      customerId = existing.id
      customerChanged =
        existing.address !== address ||
        existing.emergency_contact !== emergency_contact

      const updatePayload: Record<string, unknown> = { address, age, gender, emergency_contact, emergency_contact_relation }
      if (customerChanged) {
        const changeNote = `${booking.date} ${existing.name ?? booking.name}様の情報が更新されました`
        updatePayload.note = changeNote
      }

      await supabase
        .from('customers')
        .update(updatePayload)
        .eq('id', existing.id)
    } else if (vesselId) {
      // 初回：新規顧客として登録
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert([{
          vessel_id: vesselId,
          name: booking.name,
          tel: booking.tel,
          address,
          age: Number(age),
          gender: gender || null,
          emergency_contact,
          emergency_contact_relation: emergency_contact_relation || '',
        }])
        .select('id')
        .single()
      customerId = newCustomer?.id ?? null
    }
  }

  // passenger_logs に記録（booking_id でupsert）
  await supabase
    .from('passenger_logs')
    .upsert(
      {
        vessel_id: vesselId,
        booking_id: booking.id,
        customer_id: customerId,
        date: booking.date,
        bin_type: booking.bin_type,
        name: booking.name,
        tel: booking.tel,
        count: booking.count,
        address,
        age: Number(age),
        gender: gender || null,
        emergency_contact,
        emergency_contact_relation: emergency_contact_relation || '',
        agreed_to_terms: true,
        agreed_at: new Date().toISOString(),
      },
      { onConflict: 'booking_id' }
    )

  // 乗船名簿完了フラグを更新する
  await supabase
    .from('bookings')
    .update({ board_completed: true, board_completed_at: new Date().toISOString() })
    .eq('id', booking.id)

  return NextResponse.json({ ok: true, customerChanged })
}
