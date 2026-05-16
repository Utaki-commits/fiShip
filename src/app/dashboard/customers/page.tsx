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
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/auth/profile')
      if (!res.ok) { router.push('/login'); return }

      const user = await res.json()
      if (!user?.sub) { router.push('/login'); return }

      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', user.sub).single()
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
  // 検索変更時はページをリセット
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(0)
  }
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F2EF]">
      <div className="text-[15px] font-normal text-[#57534E]">読み込み中...</div>
    </main>
  )

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#F7F2EF] text-[#1C1917]">
      <header className="sticky top-0 z-20 flex min-h-[80px] items-center gap-4 bg-[#7F1D1D] px-5 py-[18px]">
        <button
          onClick={() => selectedCustomer ? setSelectedCustomer(null) : router.push('/dashboard')}
          className="h-14 w-14 shrink-0 rounded-[9px] border-[0.5px] border-white/30 bg-transparent text-[20px] font-normal text-white"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[22px] font-medium leading-tight text-white">
            {selectedCustomer ? selectedCustomer.name : '顧客名簿'}
          </div>
          <div className="mt-1 text-[14px] font-normal leading-relaxed text-white/80">
            {selectedCustomer
              ? `来船 ${selectedCustomer.totalVisits}回 / 合計 ${selectedCustomer.totalPeople}名`
              : `承認済み ${customers.length}名のお客さん`}
          </div>
        </div>
      </header>

      {selectedCustomer && (
        <main className="p-4">
          <section className="mb-3 rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[17px] font-medium text-[#B91C1C]">
                {selectedCustomer.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[18px] font-medium text-[#1C1917]">{selectedCustomer.name}</div>
                <div className="mt-1 text-[14px] font-normal text-[#57534E]">{selectedCustomer.tel}</div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                { label: '来船回数', value: `${selectedCustomer.totalVisits}回` },
                { label: '合計人数', value: `${selectedCustomer.totalPeople}名` },
                { label: '最終来船', value: formatDateShort(selectedCustomer.lastDate) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-[#F7F2EF] p-3 text-center">
                  <div className="mb-1 text-[12px] font-normal text-[#57534E]">{label}</div>
                  <div className="text-[13px] font-medium text-[#1C1917]">{value}</div>
                </div>
              ))}
            </div>

            {selectedCustomer.fishingStyles.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[13px] font-normal text-[#57534E]">よく使う釣り方</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCustomer.fishingStyles.map(s => (
                    <span key={s} className="rounded-full bg-[#DBEAFE] px-3 py-1 text-[13px] font-medium text-[#1E3A8A]">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedCustomer.tel && (
              <a
                href={`tel:${selectedCustomer.tel}`}
                className="flex w-full items-center justify-center rounded-[9px] bg-[#B91C1C] px-4 py-[14px] text-[15px] font-medium text-white no-underline"
              >
                {selectedCustomer.tel} に電話する
              </a>
            )}
          </section>

          <section className="overflow-hidden rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white">
            <div className="border-b-[0.5px] border-[#E8DDD8] bg-[#F7F2EF] px-4 py-[14px] text-[15px] font-medium text-[#1C1917]">
              来船履歴
            </div>
            {selectedCustomer.bookings
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(b => (
                <div key={b.id} className="flex items-center gap-3 border-b-[0.5px] border-[#E8DDD8] px-4 py-[14px] last:border-b-0">
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${
                    b.bin_type === 'day' ? 'bg-[#DBEAFE] text-[#1E3A8A]' : 'bg-[#EDE9FE] text-[#5B21B6]'
                  }`}>
                    {b.bin_type === 'day' ? '昼' : '夜'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-[#1C1917]">{formatDate(b.date)}</div>
                    <div className="mt-1 text-[13px] font-normal text-[#57534E]">
                      {b.count}名{b.fishing_style ? `　${b.fishing_style}` : ''}
                    </div>
                  </div>
                </div>
              ))}
          </section>
        </main>
      )}

      {!selectedCustomer && (
        <main className="p-4">
          <div className="mb-3">
            <input
              type="search"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="名前・電話番号で検索"
              className="w-full rounded-[8px] border-[0.5px] border-[#E8DDD8] bg-white px-4 py-[14px] text-[16px] font-normal text-[#1C1917] outline-none placeholder:text-[#A8A29E]"
            />
          </div>

          {customers.length === 0 ? (
            <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-5 py-10 text-center">
              <div className="mb-2 text-[17px] font-medium text-[#1C1917]">まだ顧客データがありません</div>
              <div className="text-[14px] font-normal leading-relaxed text-[#57534E]">
                予約が承認されるとここに顧客情報が表示されます
              </div>
            </section>
          ) : filtered.length === 0 ? (
            <section className="rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white px-5 py-10 text-center text-[14px] font-normal text-[#57534E]">
              「{search}」に一致するお客さんが見つかりません
            </section>
          ) : (
            <section className="overflow-hidden rounded-[12px] border-[0.5px] border-[#E8DDD8] bg-white">
              {paginated.map(c => (
                <button
                  key={`${c.name}__${c.tel}`}
                  onClick={() => setSelectedCustomer(c)}
                  className="flex w-full items-center gap-3 border-b-[0.5px] border-[#E8DDD8] px-4 py-[14px] text-left last:border-b-0"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[15px] font-medium text-[#B91C1C]">
                    {c.name.slice(0, 1)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 truncate text-[15px] font-medium text-[#1C1917]">{c.name}</div>
                    <div className="text-[13px] font-normal text-[#57534E]">{c.tel}</div>
                    {c.fishingStyles.length > 0 && (
                      <div className="mt-1 truncate text-[13px] font-normal text-[#A8A29E]">
                        {c.fishingStyles.join('・')}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[16px] font-medium text-[#B91C1C]">{c.totalVisits}回</div>
                    <div className="mt-1 text-[12px] font-normal text-[#A8A29E]">{formatDateShort(c.lastDate)}</div>
                  </div>
                </button>
              ))}
            </section>
          )}

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-5 py-[14px] text-[14px] font-medium text-[#57534E] disabled:text-[#A8A29E]"
              >
                前へ
              </button>
              <span className="text-[14px] font-normal text-[#57534E]">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="min-h-0 rounded-[9px] border-[0.5px] border-[#E8DDD8] bg-transparent px-5 py-[14px] text-[14px] font-medium text-[#57534E] disabled:text-[#A8A29E]"
              >
                次へ
              </button>
            </div>
          )}
        </main>
      )}
    </div>
  )
}



