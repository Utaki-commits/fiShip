import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase environment variables are missing' }, { status: 500 })
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'rejected' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ cancelled: data?.length ?? 0 })
}
