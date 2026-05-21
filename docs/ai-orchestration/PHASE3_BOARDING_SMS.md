# Phase 3: 乗船名簿（board/）実装指示書 — fiShip

実装前に CLAUDE.md・CODEX_HANDOFF.md・PROJECT_DNA.md を読むこと。

---

## タスク概要
予約固有URLによる乗船名簿記入・同意フローを実装する。
アカウント登録不要。予約固有URLが認証代わり。

---

## タスク1: board_token生成API

予約確定時にboard_tokenを生成してbookingsに保存。

```typescript
// src/app/api/bookings/route.ts に追記

import { randomBytes } from 'crypto'

// 予約登録時にトークン生成
const board_token = randomBytes(32).toString('hex')

// bookingsテーブルに保存
await supabase
  .from('bookings')
  .update({ board_token })
  .eq('id', bookingId)
```

---

## タスク2: SMS送信API

```typescript
// src/app/api/sms/route.ts（新規作成）

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { tel, booking_id, board_token, vessel_name, date, bin_name } = await req.json()

  const boardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/board/${board_token}`

  const message = `【${vessel_name}】${date} ${bin_name}のご予約が確定しました。乗船前に以下よりご登録をお願いします。${boardUrl}`

  // Twilioまたは他のSMSプロバイダーを使用
  // 環境変数: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  // 未設定の場合はコンソールログのみ（開発環境用）

  try {
    if (process.env.TWILIO_ACCOUNT_SID) {
      // Twilio実装
      const twilio = require('twilio')
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: tel.startsWith('+') ? tel : `+81${tel.replace(/^0/, '')}`,
      })
    } else {
      console.log(`[SMS開発モード] 送信先: ${tel}\nメッセージ: ${message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('SMS送信エラー:', error)
    return NextResponse.json({ error: 'SMS送信に失敗しました' }, { status: 500 })
  }
}
```

---

## タスク3: 乗船名簿ページ（新規）

```
src/app/board/[token]/page.tsx
```

### 初回アクセス時（board_completed: false）

```
[船名] ヘッダー（#7F1D1D）

【乗船確認】
5月15日 昼便
〇〇 様 2名

以下の情報をご入力ください

住所 *
[___________________]

年齢 *
[___________________]

性別 *
[男性] [女性] [その他]

緊急連絡先（電話番号） *
[___________________]

続柄（任意）
[配偶者▼] ← セレクト

─────────────────────
安全のお約束

・ライフジャケットを必ず着用してください
・船長の指示に従ってください
・採捕制限を守ってください
・体調不良の場合は申し出てください

[  上記に同意して登録する  ]
```

### 2回目以降（customers に情報が存在する場合）

```
[船名] ヘッダー

【乗船確認】
5月15日 昼便
〇〇 様 2名

以下の情報をご確認ください

住所: 〇〇県〇〇市...  [変更する]
年齢: 45歳            [変更する]
性別: 男性
緊急連絡先: 090-XXXX  [変更する]

─────────────────────
安全のお約束
（同上）

[  確認して同意する  ]  ← タップのみで完了
```

### 送信後の処理

1. passenger_logsに記録
2. customersテーブルに情報を保存（初回）または更新検知（2回目以降）
3. bookings.board_completed: true に更新
4. 完了画面を表示

### 顧客情報の変更検知（2回目以降）

既存のcustomersと入力内容を比較。
住所・緊急連絡先が異なる場合：
- customersを更新
- 船長のダッシュボードに「田中様の情報が更新されました」と通知

### トークンが無効・期限切れの場合

```
このリンクは無効です。
船長にお問い合わせください。
```

---

## タスク4: トークンの有効期限

乗船日の翌日23:59までを有効期限とする。

```typescript
// board_tokenの有効期限チェック
const booking = await supabase
  .from('bookings')
  .select('*, vessels(*)')
  .eq('board_token', token)
  .single()

if (!booking.data) {
  // トークン無効
}

const bookingDate = new Date(booking.data.date)
const expiry = new Date(bookingDate)
expiry.setDate(expiry.getDate() + 1)
expiry.setHours(23, 59, 59)

if (new Date() > expiry) {
  // 期限切れ
}
```

---

## ブランチ・コミット

```bash
git checkout -b codex/boarding-list-sms-20260521
git add src/app/board/
git add src/app/api/sms/
git commit -m "feat: 乗船名簿SMS送信・予約固有URL記入フロー実装"
git push origin codex/boarding-list-sms-20260521
```

完了後、PRを作成してレビュー依頼フォーマットで報告すること。
