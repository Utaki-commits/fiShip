import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// ---- 型定義 ----

type LineEvent = {
  type: string
  replyToken: string
  message?: {
    type: string
    text?: string
  }
}

type ExtractedInfo = {
  name: string | null
  date: string | null
  count: number | null
  fishing_style: string | null
  bin_preference: string
  is_charter: boolean
  missing_fields: string[]
}

type ExtractResult = {
  extracted: ExtractedInfo
  availability: 'open' | 'full' | 'charter'
  altDates: { date: string; remaining: number }[]
}

// ---- ヘルパー関数 ----

// LINE署名検証（HMAC-SHA256）
function verifySignature(body: string, signature: string, secret: string): boolean {
  const computed = createHmac('SHA256', secret).update(body).digest('base64')
  // タイミング攻撃対策: 長さが一致する場合のみ比較
  if (computed.length !== signature.length) return false
  return computed === signature
}

// LINE返信APIを呼び出す
async function replyToLine(replyToken: string, text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) return

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

// 日付を「MM月DD日（曜）」形式に変換
function formatDate(dateStr: string): string {
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日（${dayNames[d.getDay()]}）`
}

// 代替日リストを文字列に変換
function formatAltDates(altDates: { date: string; remaining: number }[]): string {
  return altDates
    .map(a => `・${formatDate(a.date)}（残${a.remaining}名）`)
    .join('\n')
}

// ---- Webhook本体 ----

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || ''
  const vesselId = process.env.LINE_VESSEL_ID || ''

  // 環境変数チェック
  if (!channelSecret || !vesselId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE webhook: 環境変数が未設定')
    return NextResponse.json({ error: '環境変数が未設定です' }, { status: 500 })
  }

  // 生ボディを取得（署名検証に必要）
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  // 署名検証
  if (!verifySignature(body, signature, channelSecret)) {
    return NextResponse.json({ error: '署名が無効です' }, { status: 401 })
  }

  // イベントを解析
  let events: LineEvent[] = []
  try {
    events = JSON.parse(body).events || []
  } catch {
    return NextResponse.json({ error: 'JSONパースに失敗しました' }, { status: 400 })
  }

  // ベースURL（内部API呼び出しに使用）
  const origin = new URL(req.url).origin

  for (const event of events) {
    // テキストメッセージイベントのみ処理
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const messageText = event.message.text ?? ''
    const replyToken = event.replyToken

    try {
      // /api/extract でメッセージから予約情報を抽出
      const extractRes = await fetch(`${origin}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          vessel_id: vesselId,
          channel: 'line',
        }),
      })

      // 抽出API失敗時はフォールバック返信
      if (!extractRes.ok) {
        await replyToLine(replyToken, 'ご予約ありがとうございます。\nご希望の日程とお人数を教えていただけますか？')
        continue
      }

      const { extracted, availability, altDates }: ExtractResult = await extractRes.json()

      let replyText: string

      if (!extracted.date || !extracted.count) {
        // 日付または人数が不明 → 再確認を求める
        replyText = 'ご予約ありがとうございます。\nご希望の日程とお人数を教えていただけますか？'

      } else if (availability === 'full' || availability === 'charter') {
        // 満員または貸切 → 代替日を提案
        if (altDates.length > 0) {
          replyText = `ご希望の${formatDate(extracted.date)}は満員です。\n以下の日程はいかがでしょうか？\n${formatAltDates(altDates)}`
        } else {
          replyText = `ご希望の${formatDate(extracted.date)}は満員です。\n別の日程でご連絡ください。`
        }

      } else {
        // 空きあり → 承認待ちとして予約登録してから返信
        const binType = extracted.bin_preference === '夜' ? 'night' : 'day'
        const bookRes = await fetch(`${origin}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vessel_id: vesselId,
            date: extracted.date,
            bin_type: binType,
            name: extracted.name || '未確認',
            tel: '',
            count: extracted.count,
            fishing_style: extracted.fishing_style || null,
            channel: extracted.is_charter ? 'charter' : 'line',
          }),
        })

        if (bookRes.ok) {
          replyText = `ご予約のリクエストを受け付けました。\n${formatDate(extracted.date)} ${extracted.count}名様\n船長が確認してご連絡します。`
        } else {
          replyText = 'ご予約ありがとうございます。\nご希望の日程とお人数を教えていただけますか？'
        }
      }

      await replyToLine(replyToken, replyText)

    } catch (err) {
      console.error('LINE webhook イベント処理エラー:', err)
      // エラーが起きても返信は試みる
      await replyToLine(replyToken, 'ご予約ありがとうございます。\nご希望の日程とお人数を教えていただけますか？')
    }
  }

  // LINEは200を即返す必要がある
  return NextResponse.json({ ok: true })
}
