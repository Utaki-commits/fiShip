import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { message, date, binType, count } = await request.json()

    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    })

    const prompt = `以下のメッセージから予約情報を抽出してください。
今日は${today}です。

メッセージ：「${message}」
${date ? `日付ヒント：${date}` : ''}
${binType ? `便ヒント：${binType === 'day' ? '昼便' : '夜便'}` : ''}
${count > 0 ? `人数ヒント：${count}名` : ''}

以下のJSON形式のみで返してください：
{
  "date": "YYYY-MM-DD形式 or null",
  "bin_type": "day or night or null",
  "name": "氏名 or null",
  "tel": "電話番号（数字のみ） or null",
  "count": 数字 or null,
  "note": "その他メモ or null"
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text.replace(/```json|```/g, '').trim()
      : ''

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)

  } catch (error) {
    console.error('analyze-booking error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
