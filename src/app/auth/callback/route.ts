import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type PendingCookie = {
  name: string
  value: string
  options: CookieOptions
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const cookiesToSet: PendingCookie[] = []

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookiesToSet.push({ name, value, options })
      },
      remove(name: string, options: CookieOptions) {
        cookiesToSet.push({ name, value: '', options })
      },
    },
  })

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  let nextPath = '/login'

  if (user) {
    const { data } = await supabase
      .from('vessels')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    nextPath = data ? '/dashboard' : '/register'
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin))
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
