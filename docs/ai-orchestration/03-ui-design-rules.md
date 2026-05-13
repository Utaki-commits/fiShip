# UI Design Rules

## カラートークン

### ライトモード

- `--ocean`: `#2563EB`
- `--ocean-deep`: `#1E40AF`
- `--ocean-light`: `#3B82F6`
- `--ocean-pale`: `#EFF6FF`
- `--gold`: `#D4AC0D`
- `--bg`: `#F8FAFC`
- `--surface`: `#FFFFFF`
- `--border`: `#E5E7EB`
- `--fg-1`: `#1F2937`
- `--fg-2`: `#6B7280`
- `--fg-3`: `#9CA3AF`
- `--status-day-bg`: `#EFF6FF`
- `--status-day-fg`: `#1E40AF`
- `--status-night-bg`: `#F3F0FF`
- `--status-night-fg`: `#6366F1`
- `--status-full-bg`: `#FEE2E2`
- `--status-full-fg`: `#B91C1C`
- `--status-full-bd`: `#FCA5A5`
- `--status-pending-bg`: `#FFF7ED`
- `--status-pending-fg`: `#C2410C`
- `--status-pending-dot`: `#FF8A00`
- `--status-closed-bg`: `#F1F5F9`
- `--status-closed-fg`: `#6B7280`
- `--status-ok-bg`: `#DCFCE7`
- `--status-ok-fg`: `#1FB36B`
- `--status-ok-bd`: `#86EFAC`
- `--dow-sunday`: `#B91C1C`
- `--dow-saturday`: `#2E86C1`
- `--dow-weekday`: `#111827`
- `--dow-header`: `#9CA3AF`

### ダークモード

- `--bg`: `#0F172A`
- `--surface`: `#111827`
- `--border`: `#1F2937`
- `--fg-1`: `#E2E8F0`
- `--fg-2`: `#94A3BB`
- `--fg-3`: `#64748B`
- `--ocean`: `#3B82F6`
- `--ocean-deep`: `#1E40AF`
- `--ocean-light`: `#60A5FA`
- `--ocean-pale`: `#0F172A`
- `--gold`: `#F59E0B`
- `--status-day-bg`: `#0F1F3D`
- `--status-day-fg`: `#60A5FA`
- `--status-night-bg`: `#1E1040`
- `--status-night-fg`: `#7C5CFF`
- `--status-ok-bg`: `#052E16`
- `--status-ok-fg`: `#22C55E`
- `--status-ok-bd`: `#166534`
- `--status-full-bg`: `#2D0A0A`
- `--status-full-fg`: `#FCA5A5`
- `--status-full-bd`: `#7F1D1D`
- `--status-pending-bg`: `#1C0A00`
- `--status-pending-fg`: `#FF8A00`
- `--status-pending-dot`: `#FF8A00`
- `--status-closed-bg`: `#1E293B`
- `--status-closed-fg`: `#64748B`

## タイポグラフィスケール

- `--t-meta`: `14px`
- `--t-sm`: `16px`
- `--t-base`: `18px`
- `--t-md`: `20px`
- `--t-lg`: `22px`
- `--t-xl`: `24px`
- `--t-2xl`: `28px`
- `--t-3xl`: `32px`
- `--t-display`: `40px`
- `--fw-regular`: `400`
- `--fw-semibold`: `600`
- `--fw-bold`: `700`
- bodyは `18px` / `line-height: 1.7`。
- buttonは標準で `24px` / `600`。
- input, textarea, selectは標準で `22px`。
- labelは標準で `20px` / `600`。

## スペーシングルール

- `--space-1`: `2px`
- `--space-2`: `4px`
- `--space-3`: `6px`
- `--space-4`: `8px`
- `--space-5`: `10px`
- `--space-6`: `12px`
- `--space-7`: `14px`
- `--space-8`: `16px`
- `--space-10`: `20px`
- `--space-12`: `24px`
- `--space-14`: `28px`
- `--space-16`: `32px`
- 画面左右paddingは主に `16px` または `20px`。
- カード内paddingは主に `14px` から `20px`。
- ボタン間gapは `6px` から `10px`。

## ボーダー・角丸ルール

- `--r-sm`: `6px`
- `--r-md`: `8px`
- `--r-lg`: `10px`
- `--r-xl`: `12px`
- `--r-2xl`: `14px`
- `--r-3xl`: `16px`
- `--r-pill`: `99px`
- 通常カードは `12px` から `16px`。
- バッジは `99px`。
- 入力欄は `8px` から `10px`。
- 主要ボタンは `10px` から `14px`。

## カード構造ルール

- 背景は `var(--surface)`。
- 枠線は `1px solid var(--border)`。
- 角丸は `14px` から `16px`。
- 予約カードは `boxShadow: var(--shadow-card)` を使う。
- 未連絡の承認済み予約は左ボーダーを `4px solid var(--status-pending-dot)` にする。
- カード内は上から、状態情報、主情報、補足、操作の順に置く。

## カレンダーセルルール

- 月移動ボタンは `56px`。
- セルはタップしやすい高さを確保する。
- 今日:
  - `2px solid var(--gold)`。
- 選択日:
  - `3px solid var(--ocean)`。
- 過去日:
  - 透明度を下げる。
- 休船日:
  - 予約対象から除外する。
- チャーター期間:
  - `貸切` を表示する。
  - 乗船客予約ページではタップ不可。
- 満員:
  - `満員` を表示する。

## ボタンスタイルルール

- 主要CTA:
  - background: `var(--ocean)`
  - color: `#fff`
  - border: `none`
- 保存/登録:
  - solid blue / white text。
- キャンセル:
  - transparentまたはsurface背景。
  - `2px solid var(--border)`。
- 編集:
  - blue outline。
  - color: `var(--ocean)`。
  - border: `2px solid var(--ocean-light)`。
- 削除/取消/お断り:
  - red outlineまたはred background。
  - background: `var(--status-full-bg)`。
  - color: `var(--status-full-fg)`。
  - border: `2px solid var(--status-full-bd)`。
- 承認:
  - green background。
  - `var(--status-ok-bg)`, `var(--status-ok-fg)`, `var(--status-ok-bd)`。
- 無効:
  - background: `var(--border)`。
  - color: `var(--fg-3)`。
  - cursor: `not-allowed`。

## 禁止事項

- CSS変数がある色を別の近い色で勝手に増やさない。
- ダークモードで読めない文字色を使わない。
- 主要CTAを小さなアイコンだけにしない。
- 予約カード内で情報を詰め込みすぎない。
- 編集ボタンを赤にしない。
- 削除ボタンを青にしない。
- 船長向け画面をPCダッシュボード風の横長レイアウトにしない。
