# 予約ロジック — fiShip

## ステータス遷移
新規 → pending → confirmed / rejected

## 即時成立の条件
- channel が charter 以外
- かつ同じ vessel_id + date + bin_type の pending 件数 = 0

## チャーター予約
- channel = charter は常に pending

## 定員チェック
- confirmed + pending の count 合計 + 今回の count > max_capacity → 409 FULL

## カラー表示ルール
| 状態 | 色 | 条件 |
|---|---|---|
| 赤 | #B91C1C | 満員・残り2名以下 |
| オレンジ | #D97706 | 貸切・承認待ち |
| グレー | #9CA3AF | 休船日・操作不可 |
| 青 | #2563A8 | 昼便・空きあり |
| 紫 | #7C3AED | 夜便・空きあり |

## 便設定の重複チェック
- 便名称（name）で重複を判定する
- bin_typeではなくbin_nameで重複判定する

## カレンダー週表示ルール
- 月表示から週表示に切り替えた際は
  その月の1日を含む週の日曜日を初期表示する

## 設備表示カテゴリ順
釣り道具 → 船内設備 → 魚の処理 → 販売品 → 支払方法 → こだわり設備
- 現金支払いはデフォルトON（cash: true）
