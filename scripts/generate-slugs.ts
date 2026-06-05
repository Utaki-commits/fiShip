import fs from 'fs'
import { execFileSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { generateUniqueVesselSlug, vesselNameToBaseSlug } from '../src/lib/slug'

type VesselRow = {
  id: string
  name: string
  slug: string | null
}

type SupabaseCliResult = {
  rows?: unknown[]
}

const loadLocalEnv = () => {
  const envPath = '.env.local'
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

loadLocalEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const parseSupabaseCliJson = (output: string): SupabaseCliResult => {
  const start = output.indexOf('{')
  if (start < 0) throw new Error('Supabase CLI JSON output was not found')

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < output.length; i += 1) {
    const char = output[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) return JSON.parse(output.slice(start, i + 1)) as SupabaseCliResult
  }

  throw new Error('Supabase CLI JSON output could not be parsed')
}

const runLinkedQuery = (sql: string): SupabaseCliResult => {
  const output = execFileSync('supabase', ['db', 'query', '--linked', '--output', 'json', sql], {
    encoding: 'utf-8',
  })
  return parseSupabaseCliJson(output)
}

const sqlLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`

const generateUniqueSlugFromRows = async (name: string, usedSlugs: Set<string>) => {
  const baseSlug = await vesselNameToBaseSlug(name)
  let slug = baseSlug
  let suffix = 2

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  usedSlugs.add(slug)
  return slug
}

const main = async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    const result = runLinkedQuery('select id, name, slug from vessels order by created_at asc;')
    const vessels = (result.rows || []) as VesselRow[]
    const usedSlugs = new Set(vessels.map(vessel => vessel.slug).filter(Boolean) as string[])
    let updatedCount = 0

    for (const vessel of vessels) {
      if (vessel.slug) continue

      const slug = await generateUniqueSlugFromRows(vessel.name, usedSlugs)
      runLinkedQuery(`update vessels set slug = ${sqlLiteral(slug)} where id = ${sqlLiteral(vessel.id)};`)

      updatedCount += 1
      console.log(`${vessel.name}: ${slug}`)
    }

    console.log(`Done: ${updatedCount} updated / ${vessels.length} checked`)
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from('vessels')
    .select('id, name, slug')
    .order('created_at', { ascending: true })

  if (error) throw error

  const vessels = (data || []) as VesselRow[]
  let updatedCount = 0

  for (const vessel of vessels) {
    if (vessel.slug) continue

    const slug = await generateUniqueVesselSlug(supabase, vessel.name, vessel.id)
    const { error: updateError } = await supabase
      .from('vessels')
      .update({ slug })
      .eq('id', vessel.id)

    if (updateError) throw updateError

    updatedCount += 1
    console.log(`${vessel.name}: ${slug}`)
  }

  console.log(`Done: ${updatedCount} updated / ${vessels.length} checked`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
