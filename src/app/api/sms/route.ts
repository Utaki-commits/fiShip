import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { tel, booking_id, board_token, vessel_name, date, bin_name } = await req.json()

  if (!tel || !board_token || !vessel_name || !date) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/board/${board_token}`
  const message = `【${vessel_name}】${date} ${bin_name}のご予約が確定しました。乗船前に以下よりご登録をお願いします。${boardUrl}`

  try {
    if (process.env.TWILIO_ACCOUNT_SID) {
      // Twilio Messages API を fetch で呼び出す（SDK不要）
      const sid = process.env.TWILIO_ACCOUNT_SID
      const auth = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_PHONE_NUMBER
      const to = tel.startsWith('+') ? tel : `+81${tel.replace(/^0/, '')}`

      const body = new URLSearchParams({ Body: message, From: from ?? '', To: to })
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(JSON.stringify(err))
      }
    } else {
      console.log(`[SMS開発モード] booking_id:${booking_id} 送信先:${tel}\n${message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('SMS送信エラー:', error)
    return NextResponse.json({ error: 'SMS送信に失敗しました' }, { status: 500 })
  }
}
