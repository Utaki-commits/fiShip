import { redirect } from 'next/navigation'
import { auth0 } from '@/lib/auth0'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const hasVessel = async (userId: string) => {
  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client
    .from('vessels')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

export default async function AuthCallbackPage() {
  const session = await auth0.getSession()

  if (!session?.user?.sub) {
    redirect('/login')
  }

  const auth0UserId = session.user.sub
  const registered = await hasVessel(auth0UserId)
  redirect(registered ? '/dashboard' : '/register')
}
