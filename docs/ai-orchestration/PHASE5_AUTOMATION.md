# Phase 5: 自動化 実装指示書 — fiShip

実装前に CLAUDE.md・CODEX_HANDOFF.md・PROJECT_DNA.md を読むこと。

---

## タスク概要
SNS予約の自動処理・要注意顧客通知・出船中止通知を実装する。

---

## タスク1: SNS情報不足時の自動返信

Webhook受信時にAI解析を実行し、情報不足の場合は自動返信する。

```typescript
// src/app/api/webhook/line/route.ts に追記

// AI解析後に情報不足を検知した場合
if (extractResult.missing_fields && extractResult.missing_fields.length > 0) {
  const missingLabels = extractResult.missing_fields.map(field => {
    const labels: Record<string, string> = {
      date: 'ご希望の日程',
      count: 'ご人数',
      name: 'お名前',
      bin_type: 'ご希望の便（昼便・夜便）',
    }
    return `・${labels[field] || field}`
  }).join('\n')

  const replyMessage = `ご予約のご連絡ありがとうございます。\n以下の内容が不足しておりますのでお教えください。\n${missingLabels}\nよろしくお願いいたします。`

  // LINE返信API呼び出し
  await replyToLine(replyToken, replyMessage)

  // sns_messagesのstatusを'auto_replied'に更新
  // missing_fieldsを保存してダッシュボードに表示
  await supabase
    .from('sns_messages')
    .update({
      status: 'auto_replied',
      ai_result: {
        ...extractResult,
        auto_reply_sent: true,
        auto_reply_at: new Date().toISOString(),
      }
    })
    .eq('id', messageId)
}
```

---

## タスク2: 要注意顧客の予約通知

予約登録時（/api/bookings POST）に要注意顧客チェックを追加。

```typescript
// src/app/api/bookings/route.ts に追記

// 電話番号で顧客を検索
const { data: customer } = await supabase
  .from('customers')
  .select('id, is_blacklisted')
  .eq('vessel_id', vessel_id)
  .eq('tel', tel)
  .maybeSingle()

if (customer?.is_blacklisted) {
  // auto_confirmがONでも承認待ちにする
  status = 'pending'

  // ダッシュボード通知用フラグ
  // bookingsにメタデータとして保存（既存カラムのai_resultまたは別カラム）
  needs_call_reason = '⚠️ 要注意顧客からの予約です'
}
```

---

## タスク3: 出船中止の一括通知

ダッシュボードの「本日の出船を中止する」ボタンから呼び出す。

```typescript
// src/app/api/cancel-all-bookings/route.ts（新規作成）

export async function POST(req: NextRequest) {
  const { vessel_id, date, bin_type } = await req.json()

  // その日の確定済み予約を全件取得
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, name, tel, bin_type')
    .eq('vessel_id', vessel_id)
    .eq('date', date)
    .eq('status', 'confirmed')

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, cancelled: 0 })
  }

  // 全予約をキャンセルに更新
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('vessel_id', vessel_id)
    .eq('date', date)
    .eq('status', 'confirmed')

  // SMS一括送信
  const vessel = await supabase
    .from('vessels')
    .select('name')
    .eq('id', vessel_id)
    .single()

  const cancelledCount = bookings.length
  for (const booking of bookings) {
    if (booking.tel) {
      const message = `【${vessel.data?.name}】誠に申し訳ございませんが、${date}の出船を中止させていただきます。またのご利用をお待ちしております。`

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tel: booking.tel, message }),
      })
    }
  }

  // blocked_datesに登録
  await supabase
    .from('blocked_dates')
    .insert({
      vessel_id,
      date_from: date,
      date_to: date,
      type: 'trouble',
      reason: '出船中止',
    })

  return NextResponse.json({ ok: true, cancelled: cancelledCount })
}
```

---

## タスク4: 乗船名簿OCR解析API

```typescript
// src/app/api/ocr-passenger-log/route.ts（新規作成）

export async function POST(req: NextRequest) {
  const { image_base64, vessel_id, date, bin_type } = await req.json()

  // Claude APIで画像を解析
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
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

  const data = await response.json()
  let passengers = []

  try {
    const parsed = JSON.parse(data.content[0].text)
    passengers = parsed.passengers || []
  } catch {
    passengers = []
  }

  // 既存顧客と照合して変更を検知
  const changes = []
  for (const passenger of passengers) {
    if (!passenger.name) continue

    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('vessel_id', vessel_id)
      .ilike('name', `%${passenger.name}%`)
      .maybeSingle()

    if (existing) {
      const changed = []
      if (passenger.address && existing.address !== passenger.address) {
        changed.push('住所')
      }
      if (passenger.emergency_contact && existing.emergency_contact !== passenger.emergency_contact) {
        changed.push('緊急連絡先')
      }
      if (changed.length > 0) {
        changes.push({ name: passenger.name, changed })
        // 顧客情報を更新
        await supabase
          .from('customers')
          .update({
            address: passenger.address || existing.address,
            emergency_contact: passenger.emergency_contact || existing.emergency_contact,
          })
          .eq('id', existing.id)
      }
    }
  }

  return NextResponse.json({ passengers, changes })
}
```

---

## ブランチ・コミット

```bash
git checkout -b codex/automation-20260521
git add src/app/api/
git commit -m "feat: 自動化 - SNS自動返信・要注意顧客通知・出船中止一括通知・OCR解析"
git push origin codex/automation-20260521
```

完了後、PRを作成してレビュー依頼フォーマットで報告すること。
