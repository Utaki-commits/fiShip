import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 莠育ｴ・ｒ譁ｰ隕丈ｽ懈・縺吶ｋ
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      vessel_id,
      date,
      bin_type,
      name,
      tel,
      count,
      fishing_style,
      message,
      channel = 'page',
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

    const isCharter = channel === 'charter'
    const isImmediate = !isCharter && (vesselData?.auto_confirm ?? true) && confirmedCount === 0
    const status = isImmediate ? 'confirmed' : 'pending'

    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        vessel_id,
        date,
        bin_type,
        name,
        tel,
        count: Number(count),
        fishing_style: fishing_style || null,
        message: message || null,
        status,
        channel,
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
    const { id, status, contacted } = body

    if (!id || (status == null && contacted == null)) {
      return NextResponse.json(
        { error: 'idとstatusまたはcontactedが必要です' },
        { status: 400 }
      )
    }

    // contactedのみの更新
    if (status == null) {
      if (typeof contacted !== 'boolean') {
        return NextResponse.json({ error: 'contactedはbooleanで指定してください' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({ contacted })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ booking: data })
    }

    const allowedStatuses = ['confirmed', 'rejected', 'pending']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: '無効なstatusです' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ booking: data })

  } catch {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

