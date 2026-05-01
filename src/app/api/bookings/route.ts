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
