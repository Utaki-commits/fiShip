// 運営管理API: 全船長の一覧取得・ステータス変更・代行登録
// 必須環境変数:
//   SUPABASE_SERVICE_ROLE_KEY — Supabaseダッシュボード > Settings > API > service_role
//   NEXT_PUBLIC_ADMIN_EMAIL   — 管理者メールアドレス
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// サービスロールクライアントをリクエスト時に生成する（ビルド時のエラーを防ぐ）
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

// リクエストのBearerトークンを検証し、管理者かどうかを確認する
// 共通クライアント（@/lib/supabase）でトークンを検証する
async function verifyAdmin(req: NextRequest): Promise<{ ok: boolean; error?: string }> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false, error: '認証が必要です' }

  const { data: { user } } = await supabase.auth.getUser(token)
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!user || (adminEmail && user.email !== adminEmail)) {
    return { ok: false, error: '管理者権限がありません' }
  }
  return { ok: true }
}

// user_metadataのapp_statusからステータスを判定する
function resolveStatus(meta: Record<string, unknown>): 'active' | 'locked' | 'suspended' | 'proxy' {
  if (meta?.app_status === 'locked') return 'locked'
  if (meta?.app_status === 'suspended') return 'suspended'
  if (meta?.proxy_registered === true) return 'proxy'
  return 'active'
}

// GET: 全船長の一覧を返す
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const adminClient = getAdminClient()

    // 全vessels取得（RLSをバイパス）
    const { data: vessels, error: vErr } = await adminClient
      .from('vessels')
      .select('id, name, captain_name, prefecture, port_name, created_at, user_id')
      .order('created_at', { ascending: false })

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })

    // 全認証ユーザー取得
    const { data: { users } } = await adminClient.auth.admin.listUsers()
    const userMap = new Map(users.map(u => [u.id, u]))

    const result = (vessels || []).map(v => {
      const user = userMap.get(v.user_id)
      const meta = (user?.user_metadata || {}) as Record<string, unknown>
      return {
        id: v.id,
        name: v.name,
        captain_name: v.captain_name,
        prefecture: v.prefecture,
        port_name: v.port_name,
        created_at: v.created_at,
        user_id: v.user_id,
        user_email: user?.email || '',
        status: resolveStatus(meta),
      }
    })

    return NextResponse.json({ vessels: result })
  } catch (err) {
    console.error('admin GET error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// PATCH: 船長アカウントのステータスを変更する
// action: 'lock' | 'unlock' | 'suspend' | 'activate'
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const adminClient = getAdminClient()
    const { user_id, action } = await req.json()
    if (!user_id || !action) {
      return NextResponse.json({ error: 'user_idとactionが必要です' }, { status: 400 })
    }

    // 現在のメタデータを取得して上書きを防ぐ
    const { data: { user } } = await adminClient.auth.admin.getUserById(user_id)
    const currentMeta = (user?.user_metadata || {}) as Record<string, unknown>

    let newStatus: string
    if (action === 'lock') {
      newStatus = 'locked'
    } else if (action === 'unlock') {
      newStatus = currentMeta.proxy_registered ? 'proxy' : 'active'
    } else if (action === 'suspend') {
      newStatus = 'suspended'
    } else if (action === 'activate') {
      newStatus = currentMeta.proxy_registered ? 'proxy' : 'active'
    } else {
      return NextResponse.json({ error: '無効なactionです' }, { status: 400 })
    }

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: { ...currentMeta, app_status: newStatus },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('admin PATCH error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// POST: 代行登録（船長アカウントと船情報を一括作成）
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const adminClient = getAdminClient()
    const { email, password, name, captain_name, prefecture, port_name, capacity } = await req.json()

    if (!email || !password || !name || !captain_name || !prefecture || !port_name) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'パスワードは8文字以上で入力してください' }, { status: 400 })
    }

    // 認証ユーザーを作成（メール確認済みにする）
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { proxy_registered: true, app_status: 'proxy' },
    })

    if (userError || !newUser.user) {
      return NextResponse.json({ error: userError?.message || 'ユーザー作成に失敗しました' }, { status: 400 })
    }

    // 船情報を作成
    const { error: vesselError } = await adminClient.from('vessels').insert([{
      user_id: newUser.user.id,
      name,
      captain_name,
      prefecture,
      port_name,
      capacity: Number(capacity) || 4,
      access: '',
      departure_time: '06:00',
      charter_accepted: true,
      beginner_accepted: true,
      price: '',
      notify_hours: '6:00〜21:00',
    }])

    if (vesselError) {
      // vessel作成失敗時はユーザーも削除してロールバック
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: vesselError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('admin POST error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
