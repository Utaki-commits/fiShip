import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 莠育ｴ・ｒ譁ｰ隕丈ｽ懈・縺吶ｋ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      vessel_id,
      date,
      date_to,
      bin_type,
      name,
      tel,
      count,
      fishing_style,
      message,
      channel = 'page',
      status: requestedStatus,
      is_charter,
    } = body

    if (!vessel_id || !date || !bin_type || !name || !count) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    const { data: vesselData } = await supabase
      .from('vessels')
      .select('max_bookings_per_customer, auto_confirm')
      .eq('id', vessel_id)
      .single()

    const { data: binSettingsData } = await supabase
      .from('bin_settings')
      .select('max_capacity, start_month, end_month, days_of_week')
      .eq('vessel_id', vessel_id)
      .eq('bin_type', bin_type)

    const d = new Date(date)
    const month = d.getMonth()
    const dow = d.getDay()
    const matchingBin = (binSettingsData || []).find(bin => {
      const inPeriod = bin.start_month <= bin.end_month
        ? bin.start_month <= month && month <= bin.end_month
        : month >= bin.start_month || month <= bin.end_month
      return inPeriod && (bin.days_of_week as number[]).includes(dow)
    })

    let confirmedCount = 0
    if (matchingBin) {
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('count')
        .eq('vessel_id', vessel_id)
        .eq('date', date)
        .eq('bin_type', bin_type)
        .eq('status', 'confirmed')

      confirmedCount = (existingBookings || []).reduce((s, b) => s + (b.count as number), 0)
      if (confirmedCount + Number(count) > matchingBin.max_capacity) {
        return NextResponse.json(
          { error: '満員のため予約できません', code: 'FULL' },
          { status: 409 }
        )
      }
    }

    if (tel) {
      const maxPerCustomer = vesselData?.max_bookings_per_customer ?? 5
      const { count: customerCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('vessel_id', vessel_id)
        .eq('tel', tel)
        .in('status', ['confirmed', 'pending'])
      if ((customerCount ?? 0) >= maxPerCustomer) {
        return NextResponse.json(
          { error: 'この電話番号での予約上限に達しています。船長へお問い合わせください', code: 'LIMIT_EXCEEDED' },
          { status: 409 }
        )
      }
    }

    const isCharter = Boolean(is_charter) || channel === 'charter'
    const isImmediate = !isCharter && (vesselData?.auto_confirm ?? true) && confirmedCount === 0
    const allowedStatuses = ['confirmed', 'rejected', 'pending']
    const status = allowedStatuses.includes(requestedStatus) ? requestedStatus : isImmediate ? 'confirmed' : 'pending'
    const resolvedDateTo = date_to || (isCharter ? date : null)

    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        vessel_id,
        date,
        date_to: resolvedDateTo,
        bin_type,
        name,
        tel,
        count: Number(count),
        fishing_style: fishing_style || null,
        message: message || null,
        status,
        channel,
        is_charter: isCharter,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ booking: data, isImmediate }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
// GET: 予約一覧を取得する
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vessel_id = searchParams.get('vessel_id')
  const date = searchParams.get('date')

  if (!vessel_id) {
    return NextResponse.json({ error: 'vessel_idが必要です' }, { status: 400 })
  }

  let query = supabase
    .from('bookings')
    .select('*')
    .eq('vessel_id', vessel_id)
    .order('date', { ascending: true })

  // dateが指定されていれば絞り込む
  if (date) {
    query = query.eq('date', date)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookings: data })
}

// PATCH: 予約の承認、却下、連絡済みを更新する
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, contacted, date, date_to, bin_type, name, tel, count, fishing_style, message, is_charter } = body

    const updatePayload: Record<string, unknown> = {}
    if (status != null) updatePayload.status = status
    if (contacted != null) updatePayload.contacted = contacted
    if (date != null) updatePayload.date = date
    if (date_to !== undefined) updatePayload.date_to = date_to || null
    if (bin_type != null) updatePayload.bin_type = bin_type
    if (name != null) updatePayload.name = name
    if (tel != null) updatePayload.tel = tel
    if (count != null) updatePayload.count = Number(count)
    if (fishing_style != null) updatePayload.fishing_style = fishing_style || null
    if (message != null) updatePayload.message = message || null
    if (is_charter != null) updatePayload.is_charter = Boolean(is_charter)

    if (!id || Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'idと更新内容が必要です' },
        { status: 400 }
      )
    }

    if (contacted != null && typeof contacted !== 'boolean') {
      return NextResponse.json({ error: 'contactedはbooleanで指定してください' }, { status: 400 })
    }

    const allowedStatuses = ['confirmed', 'rejected', 'pending', 'cancelled']
    if (status != null && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: '無効なstatusです' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (status === 'cancelled' && data.tel) {
      const { data: vessel } = await supabase
        .from('vessels')
        .select('id')
        .eq('id', data.vessel_id)
        .single()

      if (vessel) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, note')
          .eq('vessel_id', vessel.id)
          .eq('tel', data.tel)
          .single()

        const cancelNote = `${data.date} キャンセル`

        if (customer) {
          await supabase
            .from('customers')
            .update({
              note: customer.note
                ? `${customer.note}\n${cancelNote}`
                : cancelNote,
            })
            .eq('id', customer.id)
        } else {
          await supabase
            .from('customers')
            .insert([{
              vessel_id: vessel.id,
              name: data.name,
              tel: data.tel,
              note: cancelNote,
            }])
        }
      }
    }

    return NextResponse.json({ booking: data })

  } catch {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: 船長都合で予約を即時削除する
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'idが必要です' }, { status: 400 })
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

