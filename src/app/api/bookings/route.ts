import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 予約を新規作成する
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

    // 必須項目のバリデーション（tel はwebhook経由で空になる場合があるため任意）
    if (!vessel_id || !date || !bin_type || !name || !count) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // bin_settingsからその日・その便のmax_capacityを確認
    const { data: binSettingsData } = await supabase
      .from('bin_settings')
      .select('max_capacity, start_month, end_month, days_of_week')
      .eq('vessel_id', vessel_id)
      .eq('bin_type', bin_type)

    // 指定日に対応する便設定を特定する
    const d = new Date(date)
    const month = d.getMonth()
    const dow = d.getDay()
    const matchingBin = (binSettingsData || []).find(bin => {
      const inPeriod = bin.start_month <= bin.end_month
        ? bin.start_month <= month && month <= bin.end_month
        : month >= bin.start_month || month <= bin.end_month
      return inPeriod && (bin.days_of_week as number[]).includes(dow)
    })

    // 便設定が見つかった場合は定員チェックを行う
    if (matchingBin) {
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('count')
        .eq('vessel_id', vessel_id)
        .eq('date', date)
        .eq('bin_type', bin_type)
        .in('status', ['confirmed', 'pending'])

      const usedCount = (existingBookings || []).reduce((s, b) => s + (b.count as number), 0)
      if (usedCount + Number(count) > matchingBin.max_capacity) {
        return NextResponse.json(
          { error: '満員のため予約できません', code: 'FULL' },
          { status: 409 }
        )
      }
    }

    // 同一電話番号の予約件数が上限を超えていないか確認
    if (tel) {
      const { data: vesselData } = await supabase
        .from('vessels')
        .select('max_bookings_per_customer')
        .eq('id', vessel_id)
        .single()
      const maxPerCustomer = vesselData?.max_bookings_per_customer ?? 5
      const { count: customerCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('vessel_id', vessel_id)
        .eq('tel', tel)
        .in('status', ['confirmed', 'pending'])
      if ((customerCount ?? 0) >= maxPerCustomer) {
        return NextResponse.json(
          { error: 'ご予約の上限に達しています。お電話でお問い合わせください', code: 'LIMIT_EXCEEDED' },
          { status: 409 }
        )
      }
    }

    // 同じ日・同じ便の承認待ち件数を確認
    const { data: pendingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('vessel_id', vessel_id)
      .eq('date', date)
      .eq('bin_type', bin_type)
      .eq('status', 'pending')

    const pendingCount = pendingBookings?.length ?? 0

    // チャーターは常に承認待ち、承認待ち0件かつ非チャーターなら即時成立
    const isCharter = channel === 'charter'
    const status = isCharter || pendingCount > 0 ? 'pending' : 'confirmed'

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

    return NextResponse.json({
      booking: data,
      isImmediate: status === 'confirmed',
    })

  } catch {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// GET: 予約一覧を取得する（vessel_id必須、dateは任意）
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

  // 日付が指定されていれば絞り込む
  if (date) {
    query = query.eq('date', date)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bookings: data })
}

// PATCH: 予約の承認またはお断りをする
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'idとstatusが必要です' },
        { status: 400 }
      )
    }

    // 許可するステータス値のみ受け付ける
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
