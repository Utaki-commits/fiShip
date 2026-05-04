'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type BinSetting = {
  id: string
  vessel_id: string
  name: string         // 便の名称（例：タイラバ便）
  bin_type: 'day' | 'night'
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  fish_types: string[]
  max_capacity: number
}

type FormState = {
  name: string         // 便の名称
  bin_type: 'day' | 'night'
  start_month: number
  end_month: number
  days_of_week: number[]
  departure_time: string
  fish_input: string
  fish_types: string[]
  max_capacity: string
}

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const DAY_NAMES = ['日','月','火','水','木','金','土']

const defaultForm = (): FormState => ({
  name: '',
  bin_type: 'day',
  start_month: 0,
  end_month: 11,
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
  departure_time: '06:00',
  fish_input: '',
  fish_types: [],
  max_capacity: '',
})

export default function SettingsPage() {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [settings, setSettings] = useState<BinSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: vessel } = await supabase
        .from('vessels').select('id').eq('user_id', session.user.id).single()
      if (!vessel) { router.push('/register'); return }
      setVesselId(vessel.id)
      const { data: bs } = await supabase
        .from('bin_settings').select('*').eq('vessel_id', vessel.id)
      setSettings(bs || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleAddClick = () => {
    setEditingId(null)
    setForm(defaultForm())
    setError('')
    setView('form')
  }

  const handleEditClick = (s: BinSetting) => {
    setEditingId(s.id)
    setForm({
      name: s.name || '',
      bin_type: s.bin_type,
      start_month: s.start_month,
      end_month: s.end_month,
      days_of_week: [...s.days_of_week],
      departure_time: s.departure_time,
      fish_input: '',
      fish_types: [...s.fish_types],
      max_capacity: String(s.max_capacity),
    })
    setError('')
    setView('form')
  }

  const toggleDay = (dow: number) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(dow)
        ? f.days_of_week.filter(d => d !== dow)
        : [...f.days_of_week, dow],
    }))
  }

  const addFish = () => {
    const val = form.fish_input.trim()
    if (!val || form.fish_types.includes(val)) return
    setForm(f => ({ ...f, fish_types: [...f.fish_types, val], fish_input: '' }))
  }

  const removeFish = (fish: string) => {
    setForm(f => ({ ...f, fish_types: f.fish_types.filter(t => t !== fish) }))
  }

  const validate = (): string => {
    if (!form.name.trim()) return '便の名称を入力してください'
    if (!form.days_of_week.length) return '出る曜日を1つ以上選んでください'
    if (!form.departure_time) return '出発時刻を入力してください'
    const cap = Number(form.max_capacity)
    if (!form.max_capacity || cap < 1 || cap > 30) return '定員は1〜30名の範囲で入力してください'
    return ''
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setError(err); return }
    if (!vesselId) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        vessel_id: vesselId,
        name: form.name,
        bin_type: form.bin_type,
        start_month: form.start_month,
        end_month: form.end_month,
        days_of_week: form.days_of_week,
        departure_time: form.departure_time,
        fish_types: form.fish_types,
        max_capacity: Number(form.max_capacity),
      }
      const res = await fetch('/api/bin-settings', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '保存に失敗しました'); return }

      if (editingId) {
        setSettings(prev => prev.map(s => s.id === editingId ? data.setting : s))
      } else {
        setSettings(prev => [...prev, data.setting])
      }
      setView('list')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/bin-settings?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSettings(prev => prev.filter(s => s.id !== id))
      }
    } finally {
      setDeleting(null)
    }
  }

  const seasonLabel = (s: BinSetting) => {
    if (s.start_month === 0 && s.end_month === 11) return '通年'
    return `${MONTH_NAMES[s.start_month]}〜${MONTH_NAMES[s.end_month]}`
  }

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
          onClick={() => view === 'form' ? setView('list') : router.push('/dashboard')}
          style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            {view === 'list' ? '便の設定' : editingId ? '便を編集する' : '便を追加する'}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            {view === 'list' ? '昼便・夜便の運航スケジュールを管理' : '営業する便の情報を入力してください'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px' }}>

        {/* ===== 一覧ビュー ===== */}
        {view === 'list' && (
          <>
            {settings.length === 0 ? (
              <div style={{ background: '#fff', border: '2px dashed #E5E7EB', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⛵</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>まだ便が設定されていません</div>
                <div style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.6 }}>
                  「便を追加する」から<br />昼便・夜便を登録してください
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                {settings
                  .sort((a, b) => (a.bin_type === b.bin_type ? 0 : a.bin_type === 'day' ? -1 : 1))
                  .map(s => (
                    <div key={s.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* カードヘッダー */}
                      <div style={{
                        background: s.bin_type === 'day' ? '#E8F4FD' : '#EEF2FF',
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span style={{ fontSize: '18px' }}>{s.bin_type === 'day' ? '☀️' : '🌙'}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: s.bin_type === 'day' ? '#0A3D62' : '#4338CA' }}>
                            {s.bin_type === 'day' ? '昼便' : '夜便'}
                            {s.name ? `　${s.name}` : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: s.bin_type === 'day' ? '#0A3D62' : '#4338CA' }}>
                          {s.departure_time} 出発
                        </span>
                      </div>
                      {/* カード本文 */}
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 700, marginBottom: '2px' }}>シーズン</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{seasonLabel(s)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 700, marginBottom: '2px' }}>定員</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{s.max_capacity}名</div>
                          </div>
                        </div>
                        {/* 曜日バッジ */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: s.fish_types.length > 0 ? '10px' : '0' }}>
                          {DAY_NAMES.map((name, i) => (
                            <span key={i} style={{
                              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: '6px', fontSize: '14px', fontWeight: 700,
                              background: s.days_of_week.includes(i)
                                ? (s.bin_type === 'day' ? '#0A3D62' : '#4338CA')
                                : '#F3F4F6',
                              color: s.days_of_week.includes(i) ? '#fff' : '#D1D5DB',
                            }}>{name}</span>
                          ))}
                        </div>
                        {/* 魚種 */}
                        {s.fish_types.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {s.fish_types.map(f => (
                              <span key={f} style={{ fontSize: '14px', background: '#F3F4F6', color: '#374151', padding: '3px 8px', borderRadius: '99px', fontWeight: 600 }}>
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 操作ボタン */}
                      <div style={{ display: 'flex', gap: '0', borderTop: '1px solid #F3F4F6' }}>
                        <button
                          onClick={() => handleEditClick(s)}
                          style={{
                            flex: 1, padding: '15px', fontSize: '16px', fontWeight: 700,
                            background: '#fff', color: '#2E86C1', border: 'none',
                            borderRight: '1px solid #E5E7EB', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >編集</button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deleting === s.id}
                          style={{
                            flex: 1, padding: '15px', fontSize: '16px', fontWeight: 700,
                            background: deleting === s.id ? '#E5E7EB' : '#fff',
                            color: deleting === s.id ? '#9CA3AF' : '#B91C1C',
                            border: 'none', cursor: deleting === s.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          }}
                        >{deleting === s.id ? '削除中...' : '削除'}</button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* 追加ボタン */}
            <button
              onClick={handleAddClick}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700,
                background: '#0A3D62', color: '#fff', border: 'none', borderRadius: '12px',
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <span style={{ fontSize: '18px' }}>＋</span> 便を追加する
            </button>
          </>
        )}

        {/* ===== 追加・編集フォームビュー ===== */}
        {view === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* 便の名前 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>
                便の名前 <span style={{ background: '#B91C1C', color: '#fff', fontSize: '11px', padding: '1px 5px', borderRadius: '3px', marginLeft: '4px' }}>必須</span>
              </div>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="例：タイラバ便、イカメタル便"
                style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {/* 便の種類 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>便の種類</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {([{ key: 'day', label: '☀️ 昼便', desc: '朝〜夕方' }, { key: 'night', label: '🌙 夜便', desc: '夕方〜深夜' }] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setForm(f => ({ ...f, bin_type: opt.key, departure_time: opt.key === 'day' ? '06:00' : '17:00' }))}
                    style={{
                      flex: 1, padding: '14px 8px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                      background: form.bin_type === opt.key
                        ? (opt.key === 'day' ? '#E8F4FD' : '#EEF2FF')
                        : '#F8F9FA',
                      border: form.bin_type === opt.key
                        ? (opt.key === 'day' ? '2px solid #2E86C1' : '2px solid #4338CA')
                        : '2px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 700, color: form.bin_type === opt.key ? (opt.key === 'day' ? '#0A3D62' : '#4338CA') : '#9CA3AF' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 営業シーズン */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>営業シーズン</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <select
                  value={form.start_month}
                  onChange={e => setForm(f => ({ ...f, start_month: Number(e.target.value) }))}
                  style={{ flex: 1, padding: '12px 8px', fontSize: '16px', fontWeight: 700, border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', color: '#111827', background: '#fff' }}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '16px', color: '#6B7280', fontWeight: 700 }}>〜</span>
                <select
                  value={form.end_month}
                  onChange={e => setForm(f => ({ ...f, end_month: Number(e.target.value) }))}
                  style={{ flex: 1, padding: '12px 8px', fontSize: '16px', fontWeight: 700, border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', color: '#111827', background: '#fff' }}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </div>
              {form.start_month > form.end_month && (
                <div style={{ fontSize: '14px', color: '#D97706', marginTop: '8px', padding: '6px 8px', background: '#FEF9C3', borderRadius: '6px' }}>
                  ※ 年またぎシーズンとして設定されます（例：11月〜3月）
                </div>
              )}
            </div>

            {/* 出る曜日 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>出る曜日</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {DAY_NAMES.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    style={{
                      flex: 1, height: '64px', minWidth: '40px', borderRadius: '10px', fontSize: '16px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                      background: form.days_of_week.includes(i)
                        ? (form.bin_type === 'day' ? '#0A3D62' : '#4338CA')
                        : '#F3F4F6',
                      color: form.days_of_week.includes(i) ? '#fff' : '#9CA3AF',
                    }}
                  >{name}</button>
                ))}
              </div>
            </div>

            {/* 出発時刻 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>出発時刻</div>
              <input
                type="time"
                value={form.departure_time}
                onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))}
                style={{ width: '100%', padding: '12px', fontSize: '18px', fontWeight: 700, border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', color: '#111827' }}
              />
            </div>

            {/* 定員 */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>定員（最大人数）</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  value={form.max_capacity}
                  onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))}
                  min={1}
                  max={30}
                  placeholder="例：8"
                  style={{ flex: 1, padding: '12px', fontSize: '24px', fontWeight: 700, border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', color: '#111827', textAlign: 'center' }}
                />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>名</span>
              </div>
            </div>

            {/* 魚種（任意） */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>釣れる魚種（任意）</div>
              <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '10px' }}>予約フォームに表示されます</div>
              {form.fish_types.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {form.fish_types.map(f => (
                    <span key={f} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '16px', background: '#E8F4FD', color: '#0A3D62', padding: '4px 10px', borderRadius: '99px', fontWeight: 600 }}>
                      {f}
                      <button
                        onClick={() => removeFish(f)}
                        style={{ background: 'none', border: 'none', color: '#2E86C1', cursor: 'pointer', padding: '0', fontSize: '16px', lineHeight: 1 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={form.fish_input}
                  onChange={e => setForm(f => ({ ...f, fish_input: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFish() } }}
                  placeholder="例：マダイ"
                  style={{ flex: 1, padding: '10px 12px', fontSize: '16px', border: '2px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', color: '#111827' }}
                />
                <button
                  onClick={addFish}
                  disabled={!form.fish_input.trim()}
                  style={{
                    padding: '10px 16px', fontSize: '16px', fontWeight: 700,
                    background: form.fish_input.trim() ? '#0A3D62' : '#E5E7EB',
                    color: form.fish_input.trim() ? '#fff' : '#9CA3AF',
                    border: 'none', borderRadius: '8px', cursor: form.fish_input.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  }}
                >追加</button>
              </div>
            </div>

            {/* エラー */}
            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px', fontSize: '16px', color: '#B91C1C' }}>
                {error}
              </div>
            )}

            {/* 保存ボタン */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '16px', fontSize: '16px', fontWeight: 700,
                background: saving ? '#E5E7EB' : '#0A3D62',
                color: saving ? '#9CA3AF' : '#fff',
                border: 'none', borderRadius: '12px',
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {saving ? '保存中...' : editingId ? '変更を保存する' : 'この便を登録する'}
            </button>

            {/* キャンセル */}
            <button
              onClick={() => setView('list')}
              style={{
                width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700,
                background: 'transparent', color: '#6B7280',
                border: '2px solid #E5E7EB', borderRadius: '12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >キャンセル</button>

          </div>
        )}

      </div>
    </div>
  )
}
