import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { auth0 } from '@/lib/auth0'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const getSupabaseSession = async () => {
  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export default async function RootPage() {
  const [auth0Session, supabaseSession] = await Promise.all([
    auth0.getSession(),
    getSupabaseSession(),
  ])

  if (auth0Session || supabaseSession) {
    redirect('/dashboard')
  }

  redirect('/login')
}
