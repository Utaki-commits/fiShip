import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateUniqueVesselSlug } from '@/lib/slug'

const getAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'vessel name is required' }, { status: 400 })
    }

    const slug = await generateUniqueVesselSlug(getAdminClient(), name)
    return NextResponse.json({ slug })
  } catch (error) {
    console.error('generate slug error:', error)
    return NextResponse.json({ error: 'slug generation failed' }, { status: 500 })
  }
}
