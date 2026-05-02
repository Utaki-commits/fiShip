// 管理者アカウント初回作成API
// SUPABASE_SERVICE_ROLE_KEY が必要
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// 管理者として許可されたメールアドレスリストを返す
function getAllowedAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
  return raw.split(',').map(e => e.trim()).filter(Boolean)
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードが必要です' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
    }

    // 許可されたメールアドレスか確認
    const allowedEmails = getAllowedAdminEmails()
    if (allowedEmails.length > 0 && !allowedEmails.includes(email.trim())) {
      return NextResponse.json({ error: 'このメールアドレスは管理者として登録できません' }, { status: 403 })
    }

    const adminClient = getAdminClient()

    // 認証ユーザーを作成（メール確認済みにする）
    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, user_id: data.user?.id })
  } catch (err) {
    console.error('admin setup error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
