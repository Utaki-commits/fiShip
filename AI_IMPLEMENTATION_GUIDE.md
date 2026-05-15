# AI実装ガイド — fiShip

> AI開発者が新機能を実装するための実践的テンプレート集。
> 設計思想は `PROJECT_DNA.md` を参照。このファイルは **コードパターン** に特化している。

---

## 目次

1. [新しいダッシュボードページを追加する](#1-新しいダッシュボードページを追加する)
2. [新しいAPIルートを追加する](#2-新しいapiルートを追加する)
3. [DBカラムを追加する](#3-dbカラムを追加する)
4. [フォーム付きページのパターン](#4-フォーム付きページのパターン)
5. [リスト ↔ 詳細の2画面パターン](#5-リスト--詳細の2画面パターン)
6. [スタイルチートシート](#6-スタイルチートシート)
7. [Supabaseクエリパターン](#7-supabaseクエリパターン)
8. [よくあるミスと対処法](#8-よくあるミスと対処法)

---

## 1. 新しいダッシュボードページを追加する

### ファイル構成
```
src/app/dashboard/[新機能名]/page.tsx   ← 画面本体
```

### テンプレート（最小構成）

```tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ---- 型定義（ページ先頭にまとめる） ----
type Vessel = { id: string; name: string }
type MyData = {
  id: string
  vessel_id: string
  // ... DBのカラムに合わせる
}

export default function MyNewPage() {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [data, setData] = useState<MyData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ---- 初期化：認証→vessel取得→データ取得 ----
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }

      setVesselId(vessel.id)

      const { data: rows } = await supabase
        .from('my_table')
        .select('*')
        .eq('vessel_id', vessel.id)
        .order('created_at', { ascending: false })
      setData(rows || [])
      setLoading(false)
    }
    init()
  }, [router])

  // ---- ローディング画面 ----
  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#7F1D1D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* ヘッダー（必ず濃紺・戻るボタンあり） */}
      <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>ページタイトル</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>サブテキスト</div>
        </div>
      </div>

      {/* 本文 */}
      <div style={{ padding: '12px' }}>
        {/* コンテンツ */}
      </div>
    </div>
  )
}
```

### ダッシュボードのクイックアクションに追加する

`src/app/dashboard/page.tsx` の `quickActions` 配列に追加する：

```tsx
{ icon: '🆕', bg: '#F0FDF4', label: '新機能\nを使う', path: '/dashboard/new-feature' },
```

---

## 2. 新しいAPIルートを追加する

### ファイル構成
```
src/app/api/[エンドポイント名]/route.ts
```

### テンプレート

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST: 新規作成
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { vessel_id, field1, field2 } = body

    // 必須バリデーション
    if (!vessel_id || !field1) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // 重複チェックが必要な場合
    const { data: existing } = await supabase
      .from('my_table')
      .select('id')
      .eq('vessel_id', vessel_id)
      .eq('unique_field', field1)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ error: '同じ名前がすでに存在します' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('my_table')
      .insert([{ vessel_id, field1, field2 }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })

  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// PATCH: 更新
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, field1, field2 } = body

    if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

    const { data, error } = await supabase
      .from('my_table')
      .update({ field1, field2 })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })

  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// DELETE: 削除
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

    const { error } = await supabase.from('my_table').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })

  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// GET: 一覧取得
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vessel_id = searchParams.get('vessel_id')

  if (!vessel_id) return NextResponse.json({ error: 'vessel_idが必要です' }, { status: 400 })

  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('vessel_id', vessel_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}
```

### APIを呼び出す（クライアント側）

```ts
// 保存
const res = await fetch('/api/my-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vessel_id: vesselId, field1, field2 }),
})
const data = await res.json()
if (!res.ok) {
  setError(data.error || '保存に失敗しました')
  return
}
// 成功処理
setItems(prev => [...prev, data.item])
```

---

## 3. DBカラムを追加する

### 手順

1. `supabase/migrations/` に `.sql` ファイルを作成
2. Supabaseダッシュボードの SQL Editor で実行（自動実行なし）
3. TypeScript型定義に追加

### テンプレート

```sql
-- supabase/migrations/add_my_column.sql
-- [テーブル名] テーブルに [カラム名] カラムを追加する

ALTER TABLE my_table
  ADD COLUMN IF NOT EXISTS my_column text DEFAULT '';

-- boolean の場合
ALTER TABLE my_table
  ADD COLUMN IF NOT EXISTS my_flag boolean NOT NULL DEFAULT false;

-- integer の場合
ALTER TABLE my_table
  ADD COLUMN IF NOT EXISTS my_count integer NOT NULL DEFAULT 0;

-- jsonb の場合
ALTER TABLE my_table
  ADD COLUMN IF NOT EXISTS my_json jsonb DEFAULT '{}';
```

### RLSが必要な場合は同じファイルに追記

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vessel_owner_select"
  ON my_table FOR SELECT
  USING (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()));

CREATE POLICY "vessel_owner_insert"
  ON my_table FOR INSERT
  WITH CHECK (vessel_id IN (SELECT id FROM vessels WHERE user_id = auth.uid()));
```

---

## 4. フォーム付きページのパターン

`src/app/dashboard/settings/page.tsx` の構造を参考にする。

### 状態管理

```ts
const [view, setView] = useState<'list' | 'form'>('list')
const [editingId, setEditingId] = useState<string | null>(null)  // null = 新規
const [form, setForm] = useState<FormState>(defaultForm())
const [saving, setSaving] = useState(false)
const [error, setError] = useState('')
```

### 保存ハンドラーパターン

```ts
const handleSave = async () => {
  setError('')
  setSaving(true)
  try {
    const isNew = !editingId
    const res = await fetch('/api/my-endpoint', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isNew
        ? { vessel_id: vesselId, ...formToPayload(form) }
        : { id: editingId, ...formToPayload(form) }
      ),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || '保存に失敗しました'); return }

    if (isNew) {
      setItems(prev => [...prev, data.item])
    } else {
      setItems(prev => prev.map(i => i.id === editingId ? data.item : i))
    }
    setView('list')
  } finally {
    setSaving(false)
  }
}
```

### 削除ハンドラーパターン

```ts
const [deleting, setDeleting] = useState<string | null>(null)

const handleDelete = async (id: string) => {
  setDeleting(id)
  try {
    const res = await fetch(`/api/my-endpoint?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  } finally {
    setDeleting(null)
  }
}
```

### 入力フォームの標準コンポーネント

```tsx
{/* テキスト入力 */}
<div>
  <label style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '6px', display: 'block' }}>
    ラベル <span style={{ background: '#B91C1C', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
  </label>
  <input
    value={form.field}
    onChange={e => setForm(prev => ({ ...prev, field: e.target.value }))}
    placeholder="入力例"
    style={{ width: '100%', padding: '14px', fontSize: '15px', border: '2px solid #E5E7EB', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
  />
</div>

{/* トグルスイッチ */}
<div
  onClick={() => setForm(prev => ({ ...prev, flag: !prev.flag }))}
  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: form.flag ? '#E8F4FD' : '#fff', border: form.flag ? '2px solid #2E86C1' : '2px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', marginBottom: '10px' }}
>
  <div>
    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>オプション名</div>
    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>説明文</div>
  </div>
  <div style={{ width: '46px', height: '26px', borderRadius: '13px', background: form.flag ? '#2E86C1' : '#E5E7EB', position: 'relative', flexShrink: 0 }}>
    <div style={{ position: 'absolute', top: '3px', left: form.flag ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
  </div>
</div>

{/* 3択ボタン（無料/有料/なし）*/}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
  {[
    { value: 'free', label: '無料' },
    { value: 'paid', label: '有料' },
    { value: 'none', label: 'なし' },
  ].map(({ value, label }) => (
    <button
      key={value}
      onClick={() => setForm(prev => ({ ...prev, myField: value as 'free' | 'paid' | 'none' }))}
      style={{
        padding: '12px', fontSize: '14px', fontWeight: 700,
        background: form.myField === value ? '#E8F4FD' : '#fff',
        color: form.myField === value ? '#0A3D62' : '#6B7280',
        border: form.myField === value ? '2px solid #2E86C1' : '2px solid #E5E7EB',
        borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >{label}</button>
  ))}
</div>

{/* エラー表示 */}
{error && (
  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#B91C1C' }}>
    {error}
  </div>
)}

{/* 保存・キャンセルボタン */}
<div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
  <button
    onClick={() => setView('list')}
    style={{ flex: 1, padding: '15px', fontSize: '15px', fontWeight: 700, background: '#fff', color: '#6B7280', border: '2px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}
  >キャンセル</button>
  <button
    onClick={handleSave}
    disabled={saving}
    style={{ flex: 2, padding: '15px', fontSize: '15px', fontWeight: 700, background: saving ? '#9CA3AF' : '#0A3D62', color: '#fff', border: 'none', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
  >{saving ? '保存中...' : '保存する'}</button>
</div>
```

---

## 5. リスト ↔ 詳細の2画面パターン

`src/app/dashboard/customers/page.tsx` の構造を参考にする。

```tsx
const [selected, setSelected] = useState<MyItem | null>(null)

// ヘッダーの戻るボタン
<button onClick={() => selected ? setSelected(null) : router.push('/dashboard')}>←</button>

// 条件分岐で2画面を切り替え
{selected ? (
  <DetailView item={selected} />
) : (
  <ListView items={items} onSelect={setSelected} />
)}
```

### 検索＋ページングが必要な場合

```ts
const [search, setSearch] = useState('')
const [page, setPage] = useState(0)
const PAGE_SIZE = 20

const filtered = items.filter(i => i.name.includes(search))

// 検索変更時はページをリセット
const handleSearch = (val: string) => { setSearch(val); setPage(0) }

const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
```

---

## 6. スタイルチートシート

### レイアウト定数

```ts
const SHELL = {
  maxWidth: '480px', margin: '0 auto',
  minHeight: '100vh', background: '#F7F2EF',
  fontFamily: 'sans-serif'
}
const HEADER = {
  background: '#7F1D1D', padding: '12px 16px',
  display: 'flex', alignItems: 'center', gap: '10px',
  position: 'sticky' as const, top: 0, zIndex: 20
}
const BODY = { padding: '12px' }
const CARD = {
  background: '#fff', border: '0.5px solid #E8DDD8',
  borderRadius: '12px', padding: '16px', marginBottom: '12px'
}
```

### ボタン（コピー用）

```ts
// 保存・登録（朱赤）
{ padding: '14px', fontSize: '15px', fontWeight: 500,
  background: '#B91C1C', color: '#fff', border: 'none',
  borderRadius: '9px', cursor: 'pointer', width: '100%' }

// 編集
{ padding: '10px 16px', fontSize: '14px', fontWeight: 500,
  background: '#FEF2F2', color: '#B91C1C',
  border: '0.5px solid #FCA5A5', borderRadius: '9px', cursor: 'pointer' }

// 削除
{ padding: '10px 16px', fontSize: '14px', fontWeight: 500,
  background: 'transparent', color: '#B91C1C',
  border: '0.5px solid #FCA5A5', borderRadius: '9px', cursor: 'pointer' }

// キャンセル
{ padding: '14px', fontSize: '15px', fontWeight: 500,
  background: 'transparent', color: '#57534E',
  border: '0.5px solid #E8DDD8', borderRadius: '9px', cursor: 'pointer' }

// 無効状態
{ background: '#9CA3AF', color: '#fff', cursor: 'not-allowed' }
```

### カラーパレット

```ts
const COLORS = {
  navy:       '#0A3D62',   // メインブランドカラー・背景
  blue:       '#2E86C1',   // 編集ボタン・昼便
  gold:       '#D4AC0D',   // 今日の強調・アイコン背景
  red:        '#B91C1C',   // 削除・満員・エラー・必須バッジ
  orange:     '#D97706',   // 承認待ちバッジ・貸切
  purple:     '#4338CA',   // 夜便
  gray100:    '#F8F9FA',   // 画面背景・休船日
  gray200:    '#E5E7EB',   // ボーダー
  gray400:    '#9CA3AF',   // プレースホルダー・セクションヘッダー
  gray600:    '#6B7280',   // サブテキスト
  gray900:    '#111827',   // 主テキスト
  bgBlue:     '#E8F4FD',   // 昼便・情報バッジ背景
  bgPurple:   '#EEF2FF',   // 夜便バッジ背景
  bgRed:      '#FEE2E2',   // エラー背景・満員背景
  bgGreen:    '#D4EDDA',   // 承認済み背景
  bgYellow:   '#FFF3CD',   // 警告背景
}
```

### 日付フォーマット（必ずこのパターンを使う）

```ts
// ❌ new Date('2026-05-08') → タイムゾーンで前日になることがある
// ✅ 正しい（T00:00:00をつける）
const d = new Date('2026-05-08' + 'T00:00:00')
const label = `${d.getMonth()+1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`

// YYYY-MM-DD → Date のパターン（カレンダー用）
const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
```

### セクションヘッダー（カテゴリ区切り）

```tsx
// リスト内のカテゴリヘッダー（設備一覧などで使用）
<div style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF', padding: '10px 16px 4px', background: '#F8F9FA', borderBottom: '1px solid #F3F4F6' }}>
  カテゴリ名
</div>
```

### 空状態（データなし表示）

```tsx
<div style={{ background: '#fff', border: '2px dashed #E5E7EB', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎣</div>
  <div style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>まだデータがありません</div>
  <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>
    説明文をここに書く
  </div>
</div>
```

---

## 7. Supabaseクエリパターン

### 認証チェック（全ダッシュボードページで必須）

```ts
const { data: { session } } = await supabase.auth.getSession()
if (!session) { router.push('/login'); return }

const { data: vessel } = await supabase
  .from('vessels').select('id').eq('user_id', session.user.id).single()
if (!vessel) { router.push('/register'); return }
```

### 複数テーブルを並行取得

```ts
const [{ data: bookings }, { data: settings }] = await Promise.all([
  supabase.from('bookings').select('*').eq('vessel_id', vessel.id),
  supabase.from('bin_settings').select('*').eq('vessel_id', vessel.id),
])
```

### 重複チェック

```ts
// 存在確認（単一レコード）
const { data: existing } = await supabase
  .from('my_table')
  .select('id')
  .eq('vessel_id', vessel_id)
  .eq('unique_field', value)
  .maybeSingle()   // ← single() ではなく maybeSingle() を使う（0件でもエラーにならない）

if (existing) { /* 重複エラー */ }
```

### COUNT取得

```ts
const { count } = await supabase
  .from('bookings')
  .select('id', { count: 'exact', head: true })   // head: true でデータを取得しない
  .eq('vessel_id', vessel_id)
  .in('status', ['confirmed', 'pending'])
```

### RLSをバイパスする（Webhookなどサーバーサイド専用）

```ts
import { createClient } from '@supabase/supabase-js'

// ⚠️ クライアントコードには絶対に書かない
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

---

## 8. よくあるミスと対処法

### ❌ 祝日パッケージの直接インポート

```ts
// ❌ Vercel buildで死ぬ（ESM/CJS非互換）
import * as holidaysJp from 'holidays-jp'
import { isHoliday } from 'holidays-jp'

// ✅ 必ずこのラッパーを使う
import { getHolidayInfo } from '@/lib/holidays'
```

---

### ❌ Tailwindクラスを使う

```tsx
// ❌ 動作しない（このプロジェクトはインラインスタイル専用）
<div className="flex items-center gap-4 p-4 bg-white rounded-lg">

// ✅ 正しい
<div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#fff', borderRadius: '8px' }}>
```

---

### ❌ `new Date('YYYY-MM-DD')` をそのまま使う

```ts
// ❌ タイムゾーンによって前日になる
new Date('2026-05-08').getDate()  // → 7 になることがある

// ✅ T00:00:00 をつける
new Date('2026-05-08' + 'T00:00:00').getDate()  // → 8
```

---

### ❌ bin_type で便の重複チェックをする

```ts
// ❌ 「昼便は1つだけ」制約 → 昼便を複数登録できなくなる
.eq('bin_type', bin_type)

// ✅ 名前で重複チェック
.eq('name', resolvedName)
```

---

### ❌ IT用語をUIに表示する

```ts
// ❌ 船長が理解できない
'URLをコピーする'  →  '予約リンクをコピーする'
'Webhookを設定する'  →  'LINEと連携する'
'PDFで出力'  →  '書類を作る'
```

---

### ❌ `any` を使う

```ts
// ❌
const data: any = await res.json()

// ✅ 型を定義する
type ApiResponse = { item: MyItem }
const data: ApiResponse = await res.json()
```

---

### ❌ 承認ロジックを無視してstatus='confirmed'を直接セットする

```ts
// ❌ チャーターや pending 判定を無視
status: 'confirmed'

// ✅ ビジネスロジックに従う
const isCharter = channel === 'charter'
const pendingCount = pendingBookings?.length ?? 0
const status = isCharter || pendingCount > 0 ? 'pending' : 'confirmed'
```

---

### ❌ `bin_settings` のRLSを有効にしたまま使う

```ts
// bin_settings は RLS 無効（disable_bin_settings_rls.sql で明示的に無効化）
// 予約フォーム（公開ページ）から匿名ユーザーが読み取る必要があるため
// ❌ RLSを有効化しない
```

---

### ❌ `supabase.from('sns_messages').insert()` を anon key で呼ぶ

```ts
// sns_messages には INSERT ポリシーがない
// Webhook からは必ず service role key（adminClient）を使う
// ✅
const adminClient = getAdminClient()
await adminClient.from('sns_messages').insert({ ... })
```

---

## クイックリファレンス

| やりたいこと | 参考ファイル |
|---|---|
| 新しいダッシュボードページ | `src/app/dashboard/customers/page.tsx` |
| フォーム付き一覧画面 | `src/app/dashboard/settings/page.tsx` |
| 詳細情報の閲覧・編集 | `src/app/dashboard/vessel/page.tsx` |
| カレンダー表示 | `src/app/dashboard/page.tsx` |
| 公開フォーム（認証なし） | `src/app/reserve/[vesselId]/page.tsx` |
| REST API（CRUD） | `src/app/api/bin-settings/route.ts` |
| 予約ビジネスロジック | `src/app/api/bookings/route.ts` |
| Claude API呼び出し | `src/app/api/extract/route.ts` |
| LINEウェブフック | `src/app/api/webhook/line/route.ts` |
| 祝日取得 | `src/lib/holidays.ts` |
