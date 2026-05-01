'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Booking = {
  id: string
  date: string
  bin_type: string
  name: string
  tel: string
  count: number
  fishing_style: string | null
  status: string
}

type Customer = {
  name: string
  tel: string
  totalVisits: number
  totalPeople: number
  lastDate: string
  fishingStyles: string[]
  bookings: Booking[]
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DAY_NAMES[d.getDay()]}）`
}

const formatDateShort = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }

      // confirmed の予約のみ顧客名簿に表示（お断り・承認待ちは除外）
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, date, bin_type, name, tel, count, fishing_style, status')
        .eq('vessel_id', vessel.id)
        .eq('status', 'confirmed')
        .order('date', { ascending: false })

      if (!bookings) { setLoading(false); return }

      // 名前＋電話番号でグループ化して顧客リストを生成
      const map = new Map<string, Customer>()
      for (const b of bookings) {
        const key = `${b.name}__${b.tel}`
        if (!map.has(key)) {
          map.set(key, {
            name: b.name,
            tel: b.tel,
            totalVisits: 0,
            totalPeople: 0,
            lastDate: b.date,
            fishingStyles: [],
            bookings: [],
          })
        }
        const c = map.get(key)!
        c.totalVisits += 1
        c.totalPeople += b.count
        if (b.date > c.lastDate) c.lastDate = b.date
        if (b.fishing_style && !c.fishingStyles.includes(b.fishing_style)) {
          c.fishingStyles.push(b.fishing_style)
        }
        c.bookings.push(b)
      }

      // 最終来船日の新しい順に並べる
      const list = Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate))
      setCustomers(list)
      setLoading(false)
    }
    init()
  }, [router])

  // 検索フィルター（名前・電話番号）
  const filtered = customers.filter(c =>
    c.name.includes(search) || c.tel.replace(/-/g, '').includes(search.replace(/-/g, ''))
  )

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0A3D62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#fff', fontSize: '16px' }}>読み込み中...</div>
    </main>
  )

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#F8F9FA', fontFamily: 'sans-serif' }}>

      {/* ヘッダー */}
      <div style={{ background: '#0A3D62', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 20 }}>
        <button
          onClick={() => selectedCustomer ? setSelectedCustomer(null) : router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            {selectedCustomer ? selectedCustomer.name : '顧客名簿'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
            {selectedCustomer
              ? `来船 ${selectedCustomer.totalVisits}回 / 合計 ${selectedCustomer.totalPeople}名`
              : `承認済み ${customers.length}名のお客さん`}
          </div>
        </div>
      </div>

      {/* ===== 顧客詳細ビュー ===== */}
      {selectedCustomer && (
        <div style={{ padding: '12px' }}>

          {/* プロフィールカード */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#0A3D62', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                👤
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{selectedCustomer.name}</div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{selectedCustomer.tel}</div>
              </div>
            </div>

            {/* 統計 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: '来船回数', value: `${selectedCustomer.totalVisits}回` },
                { label: '合計人数', value: `${selectedCustomer.totalPeople}名` },
                { label: '最終来船', value: formatDateShort(selectedCustomer.lastDate) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#F8F9FA', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* よく使う釣り方 */}
            {selectedCustomer.fishingStyles.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700, marginBottom: '6px' }}>よく使う釣り方</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedCustomer.fishingStyles.map(s => (
                    <span key={s} style={{ fontSize: '13px', background: '#E8F4FD', color: '#0A3D62', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 電話ボタン */}
            {selectedCustomer.tel && (
              <a
                href={`tel:${selectedCustomer.tel}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700,
                  background: '#E8F4FD', color: '#0A3D62', border: '2px solid #2E86C1',
                  borderRadius: '10px', textDecoration: 'none', boxSizing: 'border-box',
                }}
              >
                📞　{selectedCustomer.tel} に電話する
              </a>
            )}
          </div>

          {/* 予約履歴 */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ background: '#F8F9FA', padding: '10px 16px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>来船履歴</div>
            </div>
            {selectedCustomer.bookings
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(b => (
                <div key={b.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* 昼/夜バッジ */}
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', flexShrink: 0,
                    background: b.bin_type === 'day' ? '#E8F4FD' : '#EEF2FF',
                    color: b.bin_type === 'day' ? '#0A3D62' : '#4338CA',
                  }}>
                    {b.bin_type === 'day' ? '昼' : '夜'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{formatDate(b.date)}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      {b.count}名{b.fishing_style ? `　${b.fishing_style}` : ''}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===== 顧客一覧ビュー ===== */}
      {!selectedCustomer && (
        <div style={{ padding: '12px' }}>

          {/* 検索バー */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#9CA3AF' }}>🔍</span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="名前・電話番号で検索"
              style={{
                width: '100%', padding: '12px 12px 12px 38px',
                fontSize: '15px', border: '2px solid #E5E7EB', borderRadius: '10px',
                outline: 'none', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 顧客リスト */}
          {customers.length === 0 ? (
            <div style={{ background: '#fff', border: '2px dashed #E5E7EB', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>まだ顧客データがありません</div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.6 }}>
                予約が承認されると<br />ここに顧客情報が表示されます
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#9CA3AF' }}>「{search}」に一致するお客さんが見つかりません</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(c => (
                <button
                  key={`${c.name}__${c.tel}`}
                  onClick={() => setSelectedCustomer(c)}
                  style={{
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px',
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}
                >
                  {/* アバター */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#E8F4FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    👤
                  </div>

                  {/* 情報 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{c.tel}</div>
                    {c.fishingStyles.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.fishingStyles.join('・')}
                      </div>
                    )}
                  </div>

                  {/* 来船回数バッジ */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0A3D62' }}>{c.totalVisits}</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 700 }}>回</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{formatDateShort(c.lastDate)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
