import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession as getAuth0Session } from '@auth0/nextjs-auth0'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

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
    getAuth0Session(),
    getSupabaseSession(),
  ])

  if (auth0Session || supabaseSession) {
    redirect('/dashboard')
  }

  redirect('/login')
}
