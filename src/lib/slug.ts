import type { SupabaseClient } from '@supabase/supabase-js'

type KuroshiroInstance = {
  init: (analyzer: unknown) => Promise<void>
  convert: (text: string, options: { to: string; mode?: string; romajiSystem?: string }) => Promise<string>
}

let kuroshiro: KuroshiroInstance | null = null

const getKuroshiro = async (): Promise<KuroshiroInstance> => {
  if (kuroshiro) return kuroshiro

  // kuroshiro packages do not ship TypeScript declarations.
  const KuroshiroModule = require('kuroshiro')
  const KuromojiAnalyzerModule = require('kuroshiro-analyzer-kuromoji')
  const Kuroshiro = KuroshiroModule.default || KuroshiroModule
  const KuromojiAnalyzer = KuromojiAnalyzerModule.default || KuromojiAnalyzerModule

  const instance = new Kuroshiro()
  await instance.init(new KuromojiAnalyzer())
  kuroshiro = instance
  return instance
}

export const normalizeSlugText = (text: string): string => {
  const normalized = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'ship'
}

export const vesselNameToBaseSlug = async (name: string): Promise<string> => {
  const converter = await getKuroshiro()
  const romanized = await converter.convert(name, {
    to: 'romaji',
    mode: 'spaced',
    romajiSystem: 'hepburn',
  })
  return normalizeSlugText(romanized)
}

export const generateUniqueVesselSlug = async (
  client: SupabaseClient,
  name: string,
  currentVesselId?: string
): Promise<string> => {
  const baseSlug = await vesselNameToBaseSlug(name)
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const query = client
      .from('vessels')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    const { data, error } = await query

    if (error) throw error
    if (!data || (currentVesselId && data.id === currentVesselId)) return slug

    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }
}
