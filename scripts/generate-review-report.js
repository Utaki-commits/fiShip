const fs = require('fs')
const path = require('path')

const PR_NUMBER = process.env.PR_NUMBER || 'unknown'
const PR_TITLE = process.env.PR_TITLE || 'unknown'
const BRANCH_NAME = process.env.BRANCH_NAME || 'unknown'
const DATE = new Date().toISOString().split('T')[0]

// playwright-report.jsonを読む
let testResults = { passed: 0, failed: 0, tests: [] }
try {
  const raw = fs.readFileSync('playwright-report.json', 'utf-8')
  const report = JSON.parse(raw)
  const suites = report.suites || []
  suites.forEach(suite => {
    (suite.specs || []).forEach(spec => {
      const passed = spec.tests?.every(t => t.results?.every(r => r.status === 'passed'))
      if (passed) testResults.passed++
      else testResults.failed++
      testResults.tests.push({
        title: spec.title,
        passed
      })
    })
  })
} catch (e) {
  console.log('playwright-report.jsonが読めません:', e.message)
}

const report = `# PR #${PR_NUMBER} 自動レビューレポート

## 基本情報
- PR: #${PR_NUMBER} ${PR_TITLE}
- ブランチ: ${BRANCH_NAME}
- 生成日時: ${DATE}

## Playwrightテスト結果
- 合格: ${testResults.passed}件
- 失敗: ${testResults.failed}件

### テスト詳細
${testResults.tests.map(t => `- ${t.passed ? '✅' : '❌'} ${t.title}`).join('\n')}

## スクリーンショット
- GitHub ActionsのArtifactsから確認してください
- Artifact名: screenshots-pr-${PR_NUMBER}

## 旭波デザインチェックリスト（Claudeがレビュー）
- [ ] ヘッダー背景が #7F1D1D（朱赤）になっているか
- [ ] 画面背景が #F7F2EF（和紙色）になっているか
- [ ] font-weight が 400・500 のみか
- [ ] border が 0.5px のみか
- [ ] shadow・gradient・blur がないか
- [ ] IT用語がUIに使われていないか
- [ ] タップ対象が padding 14px 以上か

## Claude向け引き継ぎ
次のレビュアーはこのレポートとArtifactsのスクリーンショットを確認してください。
Vercel Preview URL: （PRのコメントを確認）
`

// docs/ai-reports/に保存
const reportsDir = path.join(process.cwd(), 'docs', 'ai-reports')
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true })
}

const filename = `${DATE}-pr-${PR_NUMBER}-auto-review.md`
const filepath = path.join(reportsDir, filename)
fs.writeFileSync(filepath, report)
console.log(`✅ レビューレポート生成完了: ${filename}`)
