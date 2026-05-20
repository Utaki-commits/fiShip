// .github/scripts/ux-reviewer.js
const fs = require('fs')
const path = require('path')

async function reviewScreenshot(imagePath, pageName) {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const ext = path.extname(imagePath).slice(1)
  const mediaType = ext === 'jpg' ? 'image/jpeg' : 'image/png'

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
      system: `あなたはfiShipのUXレビュアーです。
対象ユーザーは30〜65歳の漁船船長（ITリテラシー低・屋外スマートフォン使用）です。

以下のPROJECT_DNAに基づいてスクリーンショットをレビューし、JSONのみを返してください：

PROJECT_DNA:
- Mobile first（390px基準）
- One screen one purpose（1画面1目的）
- 3 second recognition（3秒以内に目的が判断できる）
- Thumb reachable CTA（親指で届くCTA位置）
- No dense information（情報過多禁止）
- UX over feature count（機能数より使いやすさ）

出力形式（JSONのみ）:
{
  "verdict": "green" | "yellow" | "red",
  "summary": "1行での判定理由",
  "issues": [
    {
      "severity": "red" | "yellow",
      "description": "問題の説明",
      "suggestion": "改善提案"
    }
  ],
  "positives": ["良い点1", "良い点2"]
}`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image },
          },
          { type: 'text', text: `画面名: ${pageName}\nUXの観点でレビューしてください。` },
        ],
      }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(`Claude API error: ${JSON.stringify(data)}`)

  try {
    return JSON.parse(data.content[0].text)
  } catch {
    return { verdict: 'yellow', summary: 'パース失敗', issues: [], positives: [] }
  }
}

async function main() {
  const screenshotsDir = process.env.SCREENSHOTS_DIR || 'screenshots'
  const prNumber = process.env.PR_NUMBER || '0'
  const today = new Date().toISOString().slice(0, 10)

  if (!fs.existsSync(screenshotsDir)) {
    console.log('スクリーンショットディレクトリなし。スキップ。')
    process.exit(0)
  }

  const files = fs.readdirSync(screenshotsDir).filter(f => f.match(/\.(png|jpg|jpeg)$/))
  if (files.length === 0) { console.log('スクリーンショットなし。スキップ。'); process.exit(0) }

  console.log(`${files.length}枚をレビュー中...`)

  const results = await Promise.all(
    files.map(async (file) => {
      const pageName = path.basename(file, path.extname(file))
      const result = await reviewScreenshot(path.join(screenshotsDir, file), pageName)
      return { pageName, result }
    })
  )

  const verdicts = results.map(r => r.result.verdict)
  const overallVerdict = verdicts.includes('red') ? 'red' : verdicts.includes('yellow') ? 'yellow' : 'green'
  const verdictEmoji = { green: '🟢', yellow: '🟡', red: '🔴' }
  const verdictLabel = { green: 'Green — 通過', yellow: 'Yellow — 要確認', red: 'Red — 修正必須' }

  const comment = `## 👁️ UX Review — スクリーンショット自動レビュー

**総合判定: ${verdictEmoji[overallVerdict]} ${verdictLabel[overallVerdict]}**
対象ユーザー: 30〜65歳の漁船船長（ITリテラシー低・屋外スマートフォン使用）

---

${results.map(({ pageName, result }) => `### ${verdictEmoji[result.verdict]} ${pageName}
**${result.summary}**
${result.issues.length > 0 ? result.issues.map(i => `- ${verdictEmoji[i.severity]} ${i.description}\n  💡 ${i.suggestion}`).join('\n') : '指摘なし'}
${result.positives.length > 0 ? result.positives.map(p => `- ✅ ${p}`).join('\n') : ''}`).join('\n\n---\n\n')}

> レポート: \`docs/ai-reports/${today}-pr${prNumber}-ux-review.md\`
`

  const report = `# UX Review レポート — PR #${prNumber}\n**日時**: ${today}\n**総合判定**: ${verdictEmoji[overallVerdict]} ${verdictLabel[overallVerdict]}\n\n${results.map(({ pageName, result }) => `## ${pageName}\n判定: ${result.verdict}\n概要: ${result.summary}\n\n指摘:\n${result.issues.map(i => `- [${i.severity}] ${i.description} → ${i.suggestion}`).join('\n') || 'なし'}\n\n良い点:\n${result.positives.map(p => `- ${p}`).join('\n') || 'なし'}`).join('\n\n---\n\n')}`

  const outputFile = process.env.GITHUB_OUTPUT || '/dev/null'
  fs.appendFileSync(outputFile, `overall_verdict=${overallVerdict}\n`)
  fs.appendFileSync(outputFile, `pr_comment<<EOF\n${comment}\nEOF\n`)

  const reportsDir = path.join(process.cwd(), 'docs/ai-reports')
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
  fs.writeFileSync(path.join(reportsDir, `${today}-pr${prNumber}-ux-review.md`), report)
  console.log(`完了: ${overallVerdict}`)
}

main().catch(err => { console.error(err); process.exit(1) })
