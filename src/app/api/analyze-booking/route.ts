import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { message, date, binType, count } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
    }

    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })

    const prompt = `以下のメッセージから予約情報を抽出してください。
今日は${today}です。

メッセージ：「${message}」
${date ? `日付ヒント：${date}` : ''}
${binType ? `便ヒント：${binType === 'day' ? '昼便' : '夜便'}` : ''}
${count > 0 ? `人数ヒント：${count}名` : ''}

以下のJSON形式のみで返してください（前後に余分なテキスト不要）：
{
  "date": "YYYY-MM-DD形式 or null",
  "bin_type": "day or night or null",
  "name": "氏名 or null",
  "tel": "電話番号（数字のみ） or null",
  "count": 数字 or null,
  "note": "その他メモ or null"
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: '解析に失敗しました' }, { status: 500 })
    }

    const data = await res.json()
    const textBlock = data.content?.find((block: { type?: string }) => block.type === 'text')
    const text = (textBlock?.text || '').replace(/```json|```/g, '').trim()

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: '解析結果の読み取りに失敗しました' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: '解析に失敗しました' }, { status: 500 })
  }
}
