import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession as getAuth0Session } from '@auth0/nextjs-auth0'
import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const createCookieClient = () => {
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  })
}

const hasVessel = async (userId: string) => {
  if (!isUuid(userId)) return false

  const client = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : createCookieClient()

  const { data, error } = await client
    .from('vessels')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return false
  return Boolean(data)
}

export default async function AuthCallbackPage() {
  const auth0Session = await getAuth0Session()
  const supabase = createCookieClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()

  if (supabaseUser) {
    redirect(await hasVessel(supabaseUser.id) ? '/dashboard' : '/register')
  }

  const auth0UserId = auth0Session?.user?.sub
  if (auth0UserId) {
    redirect(await hasVessel(auth0UserId) ? '/dashboard' : '/register')
  }

  redirect('/login')
}
