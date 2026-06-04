import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { vessel_id, name, tel, message, is_charter, preferred_date } = await request.json()

    if (!vessel_id || !name) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        vessel_id,
        name,
        tel: tel || null,
        message: message || '',
        is_charter: Boolean(is_charter),
        is_negotiating: Boolean(is_charter),
        preferred_date: preferred_date || null,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contact: data }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
