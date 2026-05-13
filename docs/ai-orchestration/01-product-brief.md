# Product Brief

## プロダクトの目的

- 遊漁船の予約受付、予約確認、顧客管理、乗船名簿、船情報公開をスマートフォンだけで扱えるようにする。
- 電話、LINE、Instagram、紙のメモで散らばる予約情報を、船長が確認しやすい形にまとめる。
- 乗船客には船ごとの予約ページを提供し、空き状況を見て申し込めるようにする。
- 船長には今日・明日の予約、承認待ち、未連絡、休船日、釣行プランを短い操作で管理させる。

## ターゲットユーザー

- 主ユーザー:
  - 日本の遊漁船船長。
  - 30代から60代男性を中心に想定。
  - スマートフォン利用が中心。
  - 濡れた手、屋外、移動中でも操作する。
  - IT用語や複雑な設定画面が苦手。
- 副ユーザー:
  - 乗船客。
  - 船長から共有された予約リンクやQRコードから予約する。
  - 予約ページは端末のライト/ダーク設定に従う。

## 実装済み画面一覧

- `/login`
  - LINEログイン。
  - 電話番号OTPログイン。
  - 利用規約、プライバシーポリシーへのリンク。
- `/register`
  - 船情報の初期登録。
  - 3ステップ入力と登録完了画面。
- `/dashboard`
  - 今日・明日の予約確認。
  - 承認待ち予約。
  - TEL、連絡済み、編集、取消、削除操作。
  - クイックアクション。
- `/dashboard/bookings`
  - 予約一覧、カレンダー、予約カード。
  - 予約編集、キャンセル、削除。
  - 取り込み候補や手入力予約への導線。
- `/dashboard/bookings/new`
  - メモから予約情報をAI解析。
  - オフライン時はローカルメモ保存。
  - 解析結果確認後に予約登録。
- `/dashboard/schedule`
  - 釣行プラン設定。
  - 便の追加/編集/削除/受付中止。
  - 休船日の登録/削除。
- `/dashboard/settings`
  - `/dashboard/schedule` へリダイレクト。
- `/dashboard/vessel`
  - 船情報表示/編集。
  - 予約リンク、QRコード保存、リンクコピー。
  - 設備・サービス表示。
- `/dashboard/account`
  - 基本情報、画像、通知、予約設定、表示設定、解約、ログアウト。
- `/reserve/[vesselId]`
  - 乗船客用予約ページ。
  - カレンダー、便選択、残席表示、予約フォーム、船情報。
- `/legal/privacy`
  - プライバシーポリシー。
- `/legal/terms`
  - 利用規約。

## データベース構成

- `vessels`
  - 船の基本情報。
  - `user_id`, `name`, `captain_name`, `prefecture`, `port_name`, `access`, `parking`, `capacity`, `departure_time`, `price`。
  - 表示設定: `logo_url`, `banner_url`, `font_size`, `color_mode`。
  - 予約設定: `auto_confirm`, `max_bookings_per_customer`。
  - 受付条件: `charter_accepted`, `beginner_accepted`。
  - 設備: `facilities`。
  - サブスク: `subscribed_at`。
- `bookings`
  - 予約データ。
  - `vessel_id`, `date`, `date_to`, `bin_type`, `name`, `tel`, `count`, `fishing_style`, `message`。
  - `status`: `confirmed`, `pending`, `rejected`, `cancelled`。
  - `channel`: `page`, `line`, `line_official`, `instagram`, `phone`, `other`, `charter`。
  - `contacted`: 連絡済み状態。
  - `is_charter`: チャーター予約。
- `bin_settings`
  - 便設定。
  - `name`, `bin_type`, `start_month`, `end_month`, `days_of_week`, `departure_time`, `end_time`, `fish_types`, `max_capacity`, `price`, `enabled`。
- `blocked_dates`
  - 休船日。
  - `date_from`, `date_to`, `bin_type`, `type`, `reason`。
  - `type`: `maintenance`, `weather`, `trouble`, `other`。
- `customers`
  - 顧客情報。
  - 予約キャンセル時にキャンセル履歴を `note` に追記する。
- `booking_candidates`
  - メッセージ解析後の予約候補。
- `contacts`
  - 設定画面からのお問い合わせ。
- `passenger_logs`
  - 乗船名簿。

## 予約ロジック

- 予約作成APIは `/api/bookings` の `POST`。
- 必須項目:
  - `vessel_id`
  - `date`
  - `bin_type`
  - `name`
  - `count`
- 便設定:
  - `bin_settings` から対象日付の月、曜日、便種別に一致する便を探す。
  - `enabled = true` の便だけが予約ページに出る。
- 残席:
  - 承認済み予約のみを確定使用人数として計算する。
  - 承認待ちは実質残席の計算に含める。
  - 定員超過時は `満員のため予約できません` を返す。
- 自動承認:
  - チャーターではない。
  - `vessels.auto_confirm` が true。
  - 同日の同便に承認済み予約がない。
  - 上記を満たすと `confirmed`。
  - それ以外は `pending`。
- チャーター:
  - `is_charter` が true、または `channel === 'charter'` でチャーター扱い。
  - `date_to` が未指定なら開始日と同じ日を入れる。
  - 予約ページのカレンダーではチャーター期間を `貸切` と表示しタップ不可。
- 休船日:
  - `blocked_dates` の日付範囲に入る便は予約ページから除外する。
  - `bin_type` が null の休船日は全便対象。
- 電話番号上限:
  - 同一電話番号の `confirmed` / `pending` 予約数が `max_bookings_per_customer` 以上なら拒否。
- キャンセル:
  - `PATCH` で `status: 'cancelled'` にする。
  - 電話番号がある場合、`customers.note` に `YYYY-MM-DD キャンセル` を残す。
- 削除:
  - `DELETE /api/bookings` は船長都合の即時削除。
  - UIでは削除時に同日を休船日にする選択肢がある。

## 禁止事項

- 承認待ち予約を確定残席として扱わない。
- 休船日やチャーター期間を予約可能にしない。
- 電話番号上限を無視して予約登録しない。
- チャーターを通常予約と同じ即時承認ロジックにしない。
- 予約ページに船長向けの管理操作を出さない。
