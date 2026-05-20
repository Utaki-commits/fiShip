# Codex 引き継ぎガイド — fiShip

> 実装開始前に必ず読む。詳細ルールは各参照先を確認すること。

## 着手前に読むファイル（この順で）
1. CLAUDE.md — 役割・フロー・絶対ルール
2. PROJECT_DNA.md — DBスキーマ・予約ロジック
3. AI_IMPLEMENTATION_GUIDE.md — コードパターン・スタイル
4. docs/design-system/concept.md — 旭波デザイントークン

## タスク指示フォーマット
Claudeから以下の形式で渡される：

```
## タスク: [機能名]
### 概要
### 変更ファイル
### 仕様詳細
### 完了条件
### 注意事項
```

## コーディング規約
- スタイル：既存画面=インラインスタイル / 新規画面=Tailwind + shadcn/ui
- `any` 禁止・型定義はファイル先頭
- 日付：`new Date('YYYY-MM-DD' + 'T00:00:00')` を使う
- 祝日：`import { getHolidayInfo } from '@/lib/holidays'` のみ

## Gitルール
```
git checkout -b codex/[機能名]-[YYYYMMDD]
git commit -m "Add: ..."
git push origin codex/[機能名]-[YYYYMMDD]
```
mainへの直接プッシュ禁止。必ずブランチを切る。

## 実装前セルフチェック
- [ ] ボタン色がルール通りか（docs/design-system/concept.md）
- [ ] IT用語が混入していないか（docs/ux-principles.md）
- [ ] タップ対象が padding 14px 以上か
- [ ] `any` 型を使っていないか
- [ ] `new Date('YYYY-MM-DD')` を直接使っていないか
- [ ] `holidays-jp` を直接インポートしていないか
- [ ] 承認ロジックが正しいか（docs/reservation-logic.md）
- [ ] bin_settings の重複チェックが name ベースか
- [ ] DBカラム追加時にマイグレーションを作成したか

## レビュー依頼フォーマット
```
## レビュー依頼
### ブランチ: codex/[機能名]-[日付]
### 変更ファイル:
### 実装内容:
### 確認してほしい点:
### Vercel Preview URL:
```

## 禁止事項
- mainへの直接コミット
- `any` 型
- `holidays-jp` 直接インポート
- `new Date('YYYY-MM-DD')` パターン
- bin_type による便重複チェック
- SUPABASE_SERVICE_ROLE_KEY をクライアントに含める
- 仕様書なしでの実装開始

## トラブル対応
| 状況 | 対応 |
|---|---|
| 仕様不明 | Claudeに確認してから実装 |
| Vercel build失敗 | AI_IMPLEMENTATION_GUIDE.md の「よくあるミス」を確認 |
| Supabaseエラー | RLS設定・サービスロールキーを確認 |

## Auditor監査について
PRはReviewer通過後、Architecture AuditorとUX Auditorで並列監査される。
Red判定時は修正してPRを更新すること。Yellow判定時は人間が確認して判断。
判定基準: docs/ai-orchestration/AUDITOR_RULES.md
