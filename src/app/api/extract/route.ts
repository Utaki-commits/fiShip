import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const client = new Anthropic()

// Claudeでメッセージから予約情報を抽出する
async function extractBookingInfo(message: string, today: string) {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [{
      role: 'user',
      content: `今日の日付: ${today}

以下のSNSまたは電話メモから予約情報を抽出してください。
JSONのみを返してください（他のテキストは不要）。

メッセージ:
"""
${message}
"""

以下の形式で返してください:
{
  "name": "顧客名（不明な場合はnull）",
  "date": "YYYY-MM-DD形式（不明な場合はnull）",
  "count": 人数を表す数字（不明な場合はnull）,
  "fishing_style": "釣り方・釣り物（不明な場合はnull）",
  "bin_preference": "昼または夜または不明",
  "is_charter": true（貸切希望）またはfalse,
  "missing_fields": ["不足している必須項目：name・date・countのうち不明なものを列挙"],
  "confidence": 0.0〜1.0の解析信頼度
}

日付の解釈ルール：「来週の土曜」「今週末」などの相対表現は今日の日付を基準に変換してください。`,
    }],
  })

  // テキストブロックのみ対象（thinkingブロックは除外）
  const textBlock = response.content.find(b => b.type === 'text')
  const text = textBlock?.type === 'text' ? textBlock.text : ''

  // JSONを抽出
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON抽出に失敗しました')
  return JSON.parse(match[0])
}

// 代替日を取得（指定日以降7〜14日以内で空いている日を最大3件）
async function getAltDates(vesselId: string, startDate: string, capacity: number) {
  const start = new Date(startDate)
  const altDates: { date: string; remaining: number }[] = []

  for (let i = 1; i <= 14 && altDates.length < 3; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    const { data: bk } = await supabase
      .from('bookings')
      .select('count')
      .eq('vessel_id', vesselId)
      .eq('date', dateStr)
      .in('status', ['confirmed', 'pending'])

    const total = (bk || []).reduce((s, b) => s + (b.count as number), 0)
    if (total < capacity) {
      altDates.push({ date: dateStr, remaining: capacity - total })
    }
  }

  return altDates
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, vessel_id, channel } = body

    if (!message || !vessel_id) {
      return NextResponse.json(
        { error: 'messageとvessel_idが必要です' },
        { status: 400 }
      )
    }

    // 今日の日付（日本時間）
    const today = new Date().toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '-')

    // Claudeで解析
    const extracted = await extractBookingInfo(message, today)

    // 船の定員を取得
    const { data: vessel } = await supabase
      .from('vessels')
      .select('capacity')
      .eq('id', vessel_id)
      .single()

    const capacity = vessel?.capacity ?? 4
    let availability: 'open' | 'full' | 'charter' = 'open'
    let altDates: { date: string; remaining: number }[] = []

    // 日付が判明している場合は空き状況を確認
    if (extracted.date) {
      const binType = extracted.bin_preference === '夜' ? 'night' : 'day'

      const { data: bk } = await supabase
        .from('bookings')
        .select('count, channel')
        .eq('vessel_id', vessel_id)
        .eq('date', extracted.date)
        .eq('bin_type', binType)
        .in('status', ['confirmed', 'pending'])

      const total = (bk || []).reduce((s, b) => s + (b.count as number), 0)
      const hasCharter = (bk || []).some((b) => (b.channel as string) === 'charter')

      if (extracted.is_charter || hasCharter) {
        availability = 'charter'
      } else if (total >= capacity) {
        availability = 'full'
      }

      // 満員・貸切の場合のみ代替日を返す（予約ページ経由では不要）
      if (availability !== 'open' && channel !== 'page') {
        altDates = await getAltDates(vessel_id, extracted.date, capacity)
      }
    }

    return NextResponse.json({ extracted, availability, altDates })

  } catch (err) {
    console.error('extract error:', err)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
