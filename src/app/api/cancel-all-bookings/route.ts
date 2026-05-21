import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 指定日の確定済み予約を全件キャンセルし、SMS通知・blocked_dates登録を行う
export async function POST(req: NextRequest) {
  try {
    const { vessel_id, date, bin_type } = await req.json()

    if (!vessel_id || !date) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // 確定済み予約を全件取得（bin_typeが指定された場合は絞り込む）
    let query = supabase
      .from('bookings')
      .select('id, name, tel, bin_type')
      .eq('vessel_id', vessel_id)
      .eq('date', date)
      .eq('status', 'confirmed')

    if (bin_type) {
      query = query.eq('bin_type', bin_type)
    }

    const { data: bookings } = await query

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ ok: true, cancelled: 0 })
    }

    // 全予約をキャンセルに更新する
    const cancelQuery = supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('vessel_id', vessel_id)
      .eq('date', date)
      .eq('status', 'confirmed')

    if (bin_type) {
      await cancelQuery.eq('bin_type', bin_type)
    } else {
      await cancelQuery
    }

    // 船名を取得する
    const { data: vessel } = await supabase
      .from('vessels')
      .select('name')
      .eq('id', vessel_id)
      .single()

    const vesselName = vessel?.name ?? ''
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? ''

    // SMS一括送信（電話番号がある予約のみ）
    for (const booking of bookings) {
      if (!booking.tel) continue
      const cancelMessage = `【${vesselName}】誠に申し訳ございませんが、${date}の出船を中止させていただきます。またのご利用をお待ちしております。`
      await fetch(`${origin}/api/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel: booking.tel, message: cancelMessage }),
      })
    }

    // blocked_datesに出船中止日を登録する
    await supabase
      .from('blocked_dates')
      .insert({
        vessel_id,
        date_from: date,
        date_to: date,
        bin_type: bin_type || null,
        type: 'trouble',
        reason: '出船中止',
      })

    return NextResponse.json({ ok: true, cancelled: bookings.length })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
