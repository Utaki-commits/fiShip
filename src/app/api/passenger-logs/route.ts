import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET: 指定vessel_idの乗船名簿を取得する
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vessel_id = searchParams.get('vessel_id')
  if (!vessel_id) return NextResponse.json({ error: 'vessel_idが必要です' }, { status: 400 })

  const { data, error } = await supabase
    .from('passenger_logs')
    .select('*')
    .eq('vessel_id', vessel_id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}

// POST: 乗船名簿を登録・更新する（booking_id単位でupsert）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vessel_id, booking_id, date, bin_type, name, tel, count, address, emergency_contact } = body

    if (!vessel_id || !date || !name) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // booking_idが同じレコードがあれば更新、なければ挿入
    const { data, error } = await supabase
      .from('passenger_logs')
      .upsert(
        {
          vessel_id,
          booking_id: booking_id || null,
          date,
          bin_type,
          name,
          tel: tel || '',
          count: Number(count) || 1,
          address: address || '',
          emergency_contact: emergency_contact || '',
        },
        { onConflict: 'booking_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ log: data })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
