import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 便設定を新規作成する
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      vessel_id,
      bin_type,
      start_month,
      end_month,
      days_of_week,
      departure_time,
      fish_types,
      max_capacity,
    } = body

    // 必須項目のバリデーション
    if (!vessel_id || !bin_type || start_month == null || end_month == null
      || !days_of_week?.length || !departure_time || !max_capacity) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // 同じ vessel_id・bin_type の設定がすでに存在するか確認
    const { data: existing } = await supabase
      .from('bin_settings')
      .select('id')
      .eq('vessel_id', vessel_id)
      .eq('bin_type', bin_type)
      .single()

    if (existing) {
      const label = bin_type === 'day' ? '昼便' : '夜便'
      return NextResponse.json(
        { error: `${label}はすでに設定されています` },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('bin_settings')
      .insert([{
        vessel_id,
        bin_type,
        start_month: Number(start_month),
        end_month: Number(end_month),
        days_of_week,
        departure_time,
        fish_types: fish_types || [],
        max_capacity: Number(max_capacity),
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ setting: data })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// PATCH: 便設定を更新する
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      bin_type,
      start_month,
      end_month,
      days_of_week,
      departure_time,
      fish_types,
      max_capacity,
    } = body

    if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

    const { data, error } = await supabase
      .from('bin_settings')
      .update({
        bin_type,
        start_month: Number(start_month),
        end_month: Number(end_month),
        days_of_week,
        departure_time,
        fish_types: fish_types || [],
        max_capacity: Number(max_capacity),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ setting: data })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// DELETE: 便設定を削除する
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

    const { error } = await supabase
      .from('bin_settings')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
