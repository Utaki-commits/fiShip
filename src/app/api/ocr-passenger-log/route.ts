import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type Passenger = {
  name: string | null
  address: string | null
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  emergency_contact: string | null
  emergency_contact_relation: string | null
}

type ChangeRecord = {
  name: string
  changed: string[]
}

// POST: 乗船名簿画像をClaude APIで解析し、既存顧客との差分を検知する
export async function POST(req: NextRequest) {
  try {
    const { image_base64, vessel_id, date, bin_type } = await req.json()

    if (!image_base64 || !vessel_id) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY が未設定です' }, { status: 500 })
    }

    // Claude API で画像から乗船者情報を抽出する
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image_base64 },
            },
            {
              type: 'text',
              text: `この乗船名簿の画像から乗船者情報を読み取ってください。
以下のJSON形式のみで返してください：
{
  "passengers": [
    {
      "name": "氏名",
      "address": "住所",
      "age": 年齢（数値）,
      "gender": "male/female/other",
      "emergency_contact": "緊急連絡先電話番号",
      "emergency_contact_relation": "続柄"
    }
  ]
}
読み取れない項目はnullにしてください。`,
            },
          ],
        }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json()
      console.error('Claude API エラー:', err)
      return NextResponse.json({ error: 'OCR解析に失敗しました' }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    let passengers: Passenger[] = []

    try {
      const rawText: string = claudeData.content[0].text
      // マークダウンコードブロックを除去してからパース
      const jsonText = rawText.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim()
      passengers = JSON.parse(jsonText).passengers || []
    } catch {
      passengers = []
    }

    // 既存顧客と照合して変更を検知・更新する
    const changes: ChangeRecord[] = []

    for (const passenger of passengers) {
      if (!passenger.name) continue

      const { data: existing } = await supabase
        .from('customers')
        .select('id, address, emergency_contact')
        .eq('vessel_id', vessel_id)
        .ilike('name', `%${passenger.name}%`)
        .maybeSingle()

      if (!existing) continue

      const changed: string[] = []
      if (passenger.address && existing.address !== passenger.address) {
        changed.push('住所')
      }
      if (passenger.emergency_contact && existing.emergency_contact !== passenger.emergency_contact) {
        changed.push('緊急連絡先')
      }

      if (changed.length > 0) {
        changes.push({ name: passenger.name, changed })
        await supabase
          .from('customers')
          .update({
            address: passenger.address ?? existing.address,
            emergency_contact: passenger.emergency_contact ?? existing.emergency_contact,
          })
          .eq('id', existing.id)
      }
    }

    void date
    void bin_type

    return NextResponse.json({ passengers, changes })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
