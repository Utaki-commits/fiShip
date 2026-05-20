# Auditor Rules — fiShip

## 概要
Reviewer通過後、Architecture AuditorとUX Auditorが並列で監査する。
両方がGreen/Yellowになって初めてGitHubへのマージが可能。

## 信号機モデル
- Green: 通過・自動マージ可
- Yellow: 人間確認推奨・進行は可能
- Red: 修正必須・PR停止

## Architecture Auditor 監査項目
Red条件（即停止）：
- 単一コンポーネントが300行超
- hooksが1画面に5個以上
- src/配下以外への実装
- 認証・権限・DB危険操作

Yellow条件（人間確認）：
- 同じロジックが3箇所以上に重複
- utilsファイルが1つで200行超
- propsのバケツリレーが3段以上
- 将来使われない可能性が高い抽象化

## UX Auditor 監査項目（PROJECT_DNA準拠）
Red条件（即停止）：
- モバイル（390px）で主要CTAが画面外
- 1画面に主要アクションが2つ以上
- IT用語がUIテキストに含まれる
- タップ対象のpaddingが14px未満

Yellow条件（人間確認）：
- 情報ブロックが1画面に5個以上
- テキスト3段階以上の階層が混在
- 初見で3秒以内に目的が判断できない可能性

## Auditorレポート命名規則
docs/ai-reports/YYYY-MM-DD-{機能名}-auditor.md
