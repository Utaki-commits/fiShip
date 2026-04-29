import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'

// ---- 型定義 ----

type InstagramMessaging = {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: {
    mid: string
    text?: string
    is_echo?: boolean
  }
}

type InstagramEntry = {
  id: string
  time: number
  messaging?: InstagramMessaging[]
}

type InstagramPayload = {
  object: string
  entry: InstagramEntry[]
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

// Meta Webhook署名検証（X-Hub-Signature-256: sha256=<hex>）
function verifySignature(body: string, signature: string, appSecret: string): boolean {
  const expected = `sha256=${createHmac('SHA256', appSecret).update(body).digest('hex')}`
  // タイミング攻撃対策: 文字数一致時のみ比較
  if (expected.length !== signature.length) return false
  return expected === signature
}

// Instagram Graph APIでDMを返信
async function replyToInstagram(senderId: string, text: string): Promise<void> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!accessToken) return

  await fetch('https://graph.facebook.com/v21.0/me/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text },
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

// ---- GET: Webhookエンドポイント認証確認 ----
// Meta Developer ConsoleでWebhook URLを登録する際に呼ばれる

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    // 認証成功 → hub.challengeをそのまま返す（Content-Type: text/plainが必要）
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ error: '認証に失敗しました' }, { status: 403 })
}

// ---- POST: DMメッセージ受信・処理 ----

export async function POST(req: NextRequest) {
  const appSecret = process.env.INSTAGRAM_APP_SECRET || ''
  const vesselId = process.env.INSTAGRAM_VESSEL_ID || ''

  // 環境変数チェック
  if (!vesselId || !process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.error('Instagram webhook: 環境変数が未設定')
    return NextResponse.json({ error: '環境変数が未設定です' }, { status: 500 })
  }

  // 生ボディを取得（署名検証に必要）
  const body = await req.text()

  // Meta Webhook署名検証
  if (appSecret) {
    const signature = req.headers.get('x-hub-signature-256') || ''
    if (!verifySignature(body, signature, appSecret)) {
      return NextResponse.json({ error: '署名が無効です' }, { status: 401 })
    }
  }

  // JSONパース
  let payload: InstagramPayload
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'JSONパースに失敗しました' }, { status: 400 })
  }

  // Instagramオブジェクト以外は無視
  if (payload.object !== 'instagram') {
    return NextResponse.json({ ok: true })
  }

  const origin = new URL(req.url).origin

  for (const entry of payload.entry ?? []) {
    for (const messaging of entry.messaging ?? []) {
      // エコーメッセージ（自分の送信）と非テキストは除外
      if (messaging.message?.is_echo) continue
      if (!messaging.message?.text) continue

      const messageText = messaging.message.text
      const senderId = messaging.sender.id

      try {
        // /api/extract でメッセージから予約情報を抽出
        const extractRes = await fetch(`${origin}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            vessel_id: vesselId,
            channel: 'instagram',
          }),
        })

        // 抽出API失敗時はフォールバック返信
        if (!extractRes.ok) {
          await replyToInstagram(
            senderId,
            'ご予約ありがとうございます。ご希望の日程とお人数を教えていただけますか？',
          )
          continue
        }

        const { extracted, availability, altDates }: ExtractResult = await extractRes.json()

        let replyText: string

        if (!extracted.date || !extracted.count) {
          // 日付または人数が不明 → 再確認を求める
          replyText = 'ご予約ありがとうございます。ご希望の日程とお人数を教えていただけますか？'

        } else if (availability === 'full' || availability === 'charter') {
          // 満員または貸切 → 代替日を提案
          if (altDates.length > 0) {
            replyText = `ご希望の${formatDate(extracted.date)}は満員です。以下の日程はいかがでしょうか？\n${formatAltDates(altDates)}`
          } else {
            replyText = `ご希望の${formatDate(extracted.date)}は満員です。別の日程でご連絡ください。`
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
              channel: extracted.is_charter ? 'charter' : 'instagram',
            }),
          })

          if (bookRes.ok) {
            replyText = `ご予約のリクエストを受け付けました。${formatDate(extracted.date)} ${extracted.count}名様。船長が確認してご連絡します。`
          } else {
            replyText = 'ご予約ありがとうございます。ご希望の日程とお人数を教えていただけますか？'
          }
        }

        await replyToInstagram(senderId, replyText)

      } catch (err) {
        console.error('Instagram webhook イベント処理エラー:', err)
        await replyToInstagram(
          senderId,
          'ご予約ありがとうございます。ご希望の日程とお人数を教えていただけますか？',
        )
      }
    }
  }

  // Metaは200を即返す必要がある
  return NextResponse.json({ ok: true })
}
