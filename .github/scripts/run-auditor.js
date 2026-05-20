// .github/scripts/run-auditor.js
const fs = require('fs')
const path = require('path')

// Anthropic APIを呼び出す関数（プロンプトキャッシュ対応）
async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      // systemをブロック配列にしてキャッシュを有効化（ルールは変わらないため効果的）
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`Claude API error: ${JSON.stringify(data)}`)
  return data.content[0].text
}

async function main() {
  const diff = process.env.PR_DIFF || ''
  const prNumber = process.env.PR_NUMBER || '0'
  const prTitle = process.env.PR_TITLE || ''
  const today = new Date().toISOString().slice(0, 10)

  // AUDITOR_RULES.md を読み込む
  const rulesPath = path.join(process.cwd(), 'docs/ai-orchestration/AUDITOR_RULES.md')
  const rules = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf-8') : ''

  const architectureSystemPrompt = `
あなたはfiShipプロジェクトのArchitecture Auditorです。
以下のルールに基づいてPRのコードdiffを監査し、結果をJSON形式のみで返してください。

${rules}

出力形式（JSONのみ・前後に余分なテキスト不要）:
{
  "verdict": "green" | "yellow" | "red",
  "summary": "1行での判定理由",
  "issues": [
    { "severity": "red" | "yellow", "description": "問題の説明", "location": "ファイル名（不明な場合は空文字）" }
  ]
}
issuesが空の場合は空配列を返すこと。
`

  const uxSystemPrompt = `
あなたはfiShipプロジェクトのUX Auditorです。
対象ユーザーは30〜65歳の漁船船長（ITリテラシー低・屋外スマートフォン使用）です。
以下のルールに基づいてPRのコードdiffを監査し、結果をJSON形式のみで返してください。

${rules}

出力形式（JSONのみ・前後に余分なテキスト不要）:
{
  "verdict": "green" | "yellow" | "red",
  "summary": "1行での判定理由",
  "issues": [
    { "severity": "red" | "yellow", "description": "問題の説明", "location": "ファイル名（不明な場合は空文字）" }
  ]
}
issuesが空の場合は空配列を返すこと。
`

  const userPrompt = `
PR #${prNumber}: ${prTitle}

以下のdiffを監査してください：

\`\`\`diff
${diff.slice(0, 12000)}
\`\`\`
`

  console.log('Auditor並列実行中...')

  // Architecture Auditor と UX Auditor を並列実行
  const [archResultRaw, uxResultRaw] = await Promise.all([
    callClaude(architectureSystemPrompt, userPrompt),
    callClaude(uxSystemPrompt, userPrompt),
  ])

  let archResult, uxResult
  try {
    archResult = JSON.parse(archResultRaw)
  } catch {
    archResult = { verdict: 'yellow', summary: 'レスポースのパースに失敗', issues: [] }
  }
  try {
    uxResult = JSON.parse(uxResultRaw)
  } catch {
    uxResult = { verdict: 'yellow', summary: 'レスポンスのパースに失敗', issues: [] }
  }

  // 総合判定（redが1つでもあればred、yellowが1つでもあればyellow）
  const verdicts = [archResult.verdict, uxResult.verdict]
  const overallVerdict = verdicts.includes('red') ? 'red'
    : verdicts.includes('yellow') ? 'yellow'
    : 'green'

  const verdictEmoji = { green: '🟢', yellow: '🟡', red: '🔴' }
  const verdictLabel = { green: 'Green — 通過', yellow: 'Yellow — 人間確認推奨', red: 'Red — 修正必須' }

  // PRコメント本文を生成
  const comment = `## 🤖 Auditor 監査結果

**総合判定: ${verdictEmoji[overallVerdict]} ${verdictLabel[overallVerdict]}**

---

### Architecture Auditor ${verdictEmoji[archResult.verdict]}

**${archResult.summary}**

${archResult.issues.length === 0 ? '指摘事項なし' : archResult.issues.map(i =>
  `- ${verdictEmoji[i.severity]} **${i.severity.toUpperCase()}**: ${i.description}${i.location ? ` \`${i.location}\`` : ''}`
).join('\n')}

---

### UX Auditor ${verdictEmoji[uxResult.verdict]}

**${uxResult.summary}**

${uxResult.issues.length === 0 ? '指摘事項なし' : uxResult.issues.map(i =>
  `- ${verdictEmoji[i.severity]} **${i.severity.toUpperCase()}**: ${i.description}${i.location ? ` \`${i.location}\`` : ''}`
).join('\n')}

---

> 判定基準: \`docs/ai-orchestration/AUDITOR_RULES.md\`
> レポート: \`docs/ai-reports/${today}-pr${prNumber}-auditor.md\`
`

  // レポートmd本文を生成
  const report = `# Auditor レポート — PR #${prNumber}

**日時**: ${today}
**PR**: ${prTitle}
**総合判定**: ${verdictEmoji[overallVerdict]} ${verdictLabel[overallVerdict]}

## Architecture Auditor

**判定**: ${verdictEmoji[archResult.verdict]} ${archResult.verdict.toUpperCase()}
**概要**: ${archResult.summary}

${archResult.issues.length === 0 ? '指摘事項なし' : archResult.issues.map(i =>
  `- [${i.severity.toUpperCase()}] ${i.description}${i.location ? ` (${i.location})` : ''}`
).join('\n')}

## UX Auditor

**判定**: ${verdictEmoji[uxResult.verdict]} ${uxResult.verdict.toUpperCase()}
**概要**: ${uxResult.summary}

${uxResult.issues.length === 0 ? '指摘事項なし' : uxResult.issues.map(i =>
  `- [${i.severity.toUpperCase()}] ${i.description}${i.location ? ` (${i.location})` : ''}`
).join('\n')}
`

  // 出力をGitHub Actionsの環境変数ファイルに書き出す
  const outputFile = process.env.GITHUB_OUTPUT || '/dev/null'
  fs.appendFileSync(outputFile, `overall_verdict=${overallVerdict}\n`)
  fs.appendFileSync(outputFile, `pr_comment<<EOF\n${comment}\nEOF\n`)

  // レポートファイルをdocs/ai-reportsに保存
  const reportsDir = path.join(process.cwd(), 'docs/ai-reports')
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `${today}-pr${prNumber}-auditor.md`)
  fs.writeFileSync(reportPath, report, 'utf-8')

  console.log(`判定: ${overallVerdict}`)
  console.log(`レポート保存: ${reportPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
