const https = require('https')
const fs = require('fs')
const path = require('path')

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.error('エラー：VERCEL_TOKEN と VERCEL_PROJECT_ID を .env.local に設定してください')
  process.exit(1)
}

// .env.localから値を読み込む
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=')
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim()
  }
})

// Vercelに追加する環境変数
const targets = [
  { key: 'AUTH0_SECRET',           target: ['preview', 'production'] },
  { key: 'AUTH0_ISSUER_BASE_URL',  target: ['preview', 'production'] },
  { key: 'AUTH0_DOMAIN',           target: ['preview', 'production'] },
  { key: 'AUTH0_CLIENT_ID',        target: ['preview', 'production'] },
  { key: 'AUTH0_CLIENT_SECRET',    target: ['preview', 'production'] },
]

async function addEnvVar(key, value, target) {
  const body = JSON.stringify({ key, value, target, type: 'encrypted' })
  const options = {
    hostname: 'api.vercel.com',
    path: `/v10/projects/${VERCEL_PROJECT_ID}/env`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const result = JSON.parse(data)
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${key} → ${target.join('/')} 登録完了`)
          resolve(result)
        } else if (res.statusCode === 400 && result.error?.code === 'ENV_ALREADY_EXISTS') {
          console.log(`⚠️  ${key} → すでに存在するためスキップ`)
          resolve(result)
        } else {
          console.error(`❌ ${key} → エラー：`, result.error?.message)
          resolve(result)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function addAuthBaseUrl() {
  const body = JSON.stringify({
    key: 'AUTH0_BASE_URL',
    value: 'https://${VERCEL_URL}',
    target: ['preview'],
    type: 'plain'
  })
  const options = {
    hostname: 'api.vercel.com',
    path: `/v10/projects/${VERCEL_PROJECT_ID}/env`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const result = JSON.parse(data)
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ AUTH0_BASE_URL → preview 登録完了`)
          resolve(result)
        } else if (res.statusCode === 400 && result.error?.code === 'ENV_ALREADY_EXISTS') {
          console.log(`⚠️  AUTH0_BASE_URL → すでに存在するためスキップ`)
          resolve(result)
        } else {
          console.error(`❌ AUTH0_BASE_URL → エラー：`, result.error?.message)
          resolve(result)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  console.log('Vercel環境変数の登録を開始します...\n')

  for (const { key, target } of targets) {
    const value = envVars[key]
    if (!value) {
      console.log(`⚠️  ${key} → .env.localに値がないためスキップ`)
      continue
    }
    await addEnvVar(key, value, target)
  }

  await addAuthBaseUrl()
  console.log('\n完了しました。')
}

main().catch(console.error)
