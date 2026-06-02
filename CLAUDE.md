# fiShip — CLAUDE.md

## このファイルの役割
Claude・Claude Code・Codexが最初に読む入口ファイル。
詳細は下記の関連ドキュメントを参照すること。

## セッション開始時の必須手順
**新しいセッションを開始する際、最初に必ず `Memory.md`（プロジェクト直下）を読み込んでから作業を開始すること。**

---

## 役割分担

| 担当 | 作業範囲 |
|---|---|
| Claude | 仕様・設計・レビューのみ |
| Claude Code | docs/・.github/・git操作のみ |
| Codex | src/配下の実装のみ |
| Uizard | ラフ案生成のみ |
| Figma | 正式デザイン・トークン管理のみ |
| v0 | Figmaベースのコンポーネント生成のみ |

---

## 作業フロー

### 設計
オーナー → Claude（仕様策定）→ Claude Code（ドキュメント整備）

### デザイン
Uizard（ラフ案）→ Figma（正式デザイン置き場）→ v0（コード生成）→ Claude Code（v0結果をFigmaに書き起こす）

### 実装
Codex（実装・PR）→ GitHub Actions（CI）→ Vercel（Preview）→ Playwright（E2E）

### レビュー
Claude（PRレビュー）→ オーナー（最終承認・マージ）

### リミット時
- Codexリミット → Claude Codeで継続
- Claude/Claude Codeリミット → Codexで継続
- 両方リミット → 人間が手動コミット

---

## 絶対ルール
- FigmaにないUIを勝手に実装しない
- border幅は0.5px（2px禁止）
- font-weightは400/500のみ（700禁止）
- ヘッダー背景は #1B2A4A
- CTA背景は #1E4D3A
- 画面背景は #F4F6F2
- border色は #CDD3DC
- IT用語をUIに使わない
- 1画面1アクション

---

## エージェント自動呼び出しルール

以下の条件を満たした場合、対応するECCエージェントを必ず呼び出すこと。

| トリガー | エージェント | 目的 |
|---|---|---|
| src/ 配下のコードを変更・レビューする前後 | `code-reviewer` | コード品質・エラーハンドリングの自動指摘 |
| APIキー・環境変数・認証情報を含む可能性があるファイルを操作する前 | `security-reviewer` | APIキー漏洩・シークレット混入チェック |
| 複数ファイル（3ファイル以上）にまたがる実装を開始する前 | `planner` | 設計書の作成・実装方針の合意 |

### 呼び出し方
```
Agent({ subagent_type: "code-reviewer", prompt: "..." })
Agent({ subagent_type: "security-reviewer", prompt: "..." })
Agent({ subagent_type: "planner", prompt: "..." })
```

---

## 関連ドキュメント（この順で読む）
1. CODEX_HANDOFF.md — 実装ルール・チェックリスト
2. PROJECT_DNA.md — DB・予約ロジック・UX原則
3. docs/design-system/concept.md — 信頼・安心・プロフェッショナルのデザイントークン
4. AI_IMPLEMENTATION_GUIDE.md — コードパターン集
5. docs/ai-orchestration/claude-skill.md — オーケストレーション定義
6. docs/PASSENGER_UX_DNA.md — 乗船客UI設計思想
7. docs/CAPTAIN_UX_DNA.md — 船長UI設計思想
8. docs/UI_GUARDRAILS.md — UI禁止事項一覧
