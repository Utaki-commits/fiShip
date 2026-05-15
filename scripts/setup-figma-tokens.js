// 旭波デザイントークンをFigma Variablesに一括登録するスクリプト
// 使い方: FIGMA_TOKEN=xxx FIGMA_FILE_KEY=yyy node scripts/setup-figma-tokens.js

const FIGMA_TOKEN = process.env.FIGMA_TOKEN
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY

if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
  console.error('エラー: 環境変数 FIGMA_TOKEN と FIGMA_FILE_KEY を設定してください')
  console.error('例: FIGMA_TOKEN=xxx FIGMA_FILE_KEY=yyy node scripts/setup-figma-tokens.js')
  process.exit(1)
}

const BASE_URL = `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/variables`

// 旭波デザイントークン定義
const COLOR_TOKENS = [
  { name: 'vermilion-950', value: '#7F1D1D' },
  { name: 'vermilion-700', value: '#B91C1C' },
  { name: 'vermilion-600', value: '#DC2626' },
  { name: 'vermilion-50',  value: '#FEF2F2' },
  { name: 'white',         value: '#FFFFFF' },
  { name: 'washi-50',      value: '#F7F2EF' },
  { name: 'washi-200',     value: '#E8DDD8' },
  { name: 'sumi-900',      value: '#1C1917' },
  { name: 'sumi-600',      value: '#57534E' },
  { name: 'sumi-400',      value: '#A8A29E' },
  { name: 'confirmed',     value: '#059669' },
  { name: 'pending',       value: '#D97706' },
  { name: 'night',         value: '#7C3AED' },
  { name: 'day',           value: '#2563A8' },
  { name: 'day-bg',        value: '#DBEAFE' },
  { name: 'night-bg',      value: '#EDE9FE' },
  { name: 'confirmed-bg',  value: '#D1FAE5' },
  { name: 'pending-bg',    value: '#FEF3C7' },
]

const NUMBER_TOKENS = [
  { name: 'radius-card',    value: 12  },
  { name: 'radius-button',  value: 9   },
  { name: 'radius-badge',   value: 20  },
  { name: 'radius-input',   value: 8   },
  { name: 'border-default', value: 0.5 },
  { name: 'border-active',  value: 1.5 },
  { name: 'text-display',   value: 26  },
  { name: 'text-h1',        value: 19  },
  { name: 'text-body',      value: 15  },
  { name: 'text-label',     value: 12  },
  { name: 'text-caption',   value: 11  },
]

// HEXカラーをFigma用 {r, g, b, a} に変換（0〜1スケール）
function hexToFigmaColor(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return { r, g, b, a: 1 }
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`JSONパースエラー: ${text}`)
  }

  if (!res.ok) {
    throw new Error(`Figma API エラー ${res.status}: ${json.err || json.message || text}`)
  }

  return json
}

async function getExistingCollections() {
  const data = await fetchJson(BASE_URL)
  return data.meta?.variableCollections || {}
}

async function run() {
  console.log('Figmaトークン登録を開始します...')
  console.log(`ファイルKey: ${FIGMA_FILE_KEY}`)

  // 既存コレクション取得
  let collectionsMap
  try {
    collectionsMap = await getExistingCollections()
  } catch (err) {
    console.error('コレクション取得に失敗しました:', err.message)
    process.exit(1)
  }

  // 「旭波トークン」コレクションを探す or 新規作成
  const COLLECTION_NAME = '旭波トークン'
  const existing = Object.values(collectionsMap).find(c => c.name === COLLECTION_NAME)

  // variablesを構築
  const variables = []
  const variableValues = {}

  // カラー変数
  for (const token of COLOR_TOKENS) {
    variables.push({
      action: 'CREATE',
      name: `Color/${token.name}`,
      resolvedType: 'COLOR',
      variableCollectionId: 'COLLECTION_ID_PLACEHOLDER',
    })
    variableValues[`Color/${token.name}`] = hexToFigmaColor(token.value)
  }

  // 数値変数
  for (const token of NUMBER_TOKENS) {
    variables.push({
      action: 'CREATE',
      name: `Number/${token.name}`,
      resolvedType: 'FLOAT',
      variableCollectionId: 'COLLECTION_ID_PLACEHOLDER',
    })
    variableValues[`Number/${token.name}`] = token.value
  }

  // Figma Variables API POST ペイロード
  const payload = {
    variableCollections: [
      {
        action: existing ? 'UPDATE' : 'CREATE',
        id: existing ? existing.id : undefined,
        name: COLLECTION_NAME,
      },
    ],
    variables: [],
    variableModeValues: [],
  }

  // collectionIdはCREATE時に一時IDを使う（Figmaの仮IDシステム）
  const collectionTempId = existing ? existing.id : 'tempId:collection:1'
  const modeId = existing
    ? existing.defaultModeId
    : undefined

  // variable定義
  const variableEntries = []
  let idx = 1

  for (const token of COLOR_TOKENS) {
    const tempId = `tempId:var:${idx++}`
    variableEntries.push({
      tempId,
      name: `Color/${token.name}`,
      type: 'COLOR',
      value: hexToFigmaColor(token.value),
    })
  }

  for (const token of NUMBER_TOKENS) {
    const tempId = `tempId:var:${idx++}`
    variableEntries.push({
      tempId,
      name: `Number/${token.name}`,
      type: 'FLOAT',
      value: token.value,
    })
  }

  // Figma Variables Bulk API フォーマット
  const bulkPayload = {
    variableCollections: [
      {
        action: existing ? 'UPDATE' : 'CREATE',
        ...(existing ? { id: existing.id } : { id: collectionTempId }),
        name: COLLECTION_NAME,
      },
    ],
    variables: variableEntries.map((entry, i) => ({
      action: 'CREATE',
      id: entry.tempId,
      name: entry.name,
      variableCollectionId: collectionTempId,
      resolvedType: entry.type,
    })),
    variableModeValues: variableEntries.map(entry => ({
      variableId: entry.tempId,
      modeId: modeId || collectionTempId,
      value: entry.type === 'COLOR'
        ? { type: 'VARIABLE_ALIAS', value: entry.value }
        : entry.value,
    })),
  }

  // variableModeValues の value は COLOR の場合 {r,g,b,a} をそのまま渡す
  bulkPayload.variableModeValues = variableEntries.map(entry => ({
    variableId: entry.tempId,
    modeId: modeId || `${collectionTempId}/modes/0`,
    value: entry.value,
  }))

  try {
    const result = await fetchJson(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(bulkPayload),
    })

    const created = variableEntries.length
    console.log(`\n登録完了：${created}件`)
    console.log(`  カラー変数: ${COLOR_TOKENS.length}件`)
    console.log(`  数値変数:   ${NUMBER_TOKENS.length}件`)

    if (result.meta?.variables) {
      console.log(`\nFigma変数ID割り当て数: ${Object.keys(result.meta.variables).length}件`)
    }
  } catch (err) {
    console.error('\n登録に失敗しました:', err.message)
    process.exit(1)
  }
}

run()
