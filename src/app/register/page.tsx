'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    captain_name: '',
    capacity: 4,
    prefecture: '',
    port_name: '',
    access: '',
    departure_time: '05:00',
    charter_accepted: true,
    beginner_accepted: true,
    price: '',
    notify_hours: '6:00〜21:00',
  })

  const router = useRouter()

  const update = (key: string, val: unknown) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { error } = await supabase.from('vessels').insert([{
      ...form,
      user_id: user.id,
    }])
    if (error) {
      setError('登録に失敗しました。もう一度お試しください。')
      setLoading(false)
    } else {
      // 完了画面（step4）へ進む
      setStep(4)
    }
  }

  const styles = {
    shell: { minHeight:'100vh', background:'#F8F9FA', fontFamily:'sans-serif', maxWidth:'480px', margin:'0 auto' },
    header: { background:'#0A3D62', padding:'20px 16px 34px', position:'relative' as const, overflow:'hidden' },
    headerAfter: { position:'absolute' as const, bottom:'-16px', left:0, right:0, height:'32px', background:'#F8F9FA', borderRadius:'50% 50% 0 0 / 100% 100% 0 0' },
    title: { fontSize:'20px', fontWeight:700, color:'#fff', marginBottom:'3px' },
    sub: { fontSize:'12px', color:'rgba(255,255,255,0.75)' },
    body: { padding:'20px 16px' },
    label: { fontSize:'13px', fontWeight:700, color:'#6B7280', marginBottom:'6px', display:'block' },
    input: { width:'100%', padding:'14px', fontSize:'15px', border:'2px solid #E5E7EB', borderRadius:'10px', outline:'none', fontFamily:'inherit', marginBottom:'14px' },
    btn: { width:'100%', padding:'17px', fontSize:'16px', fontWeight:700, background:'#0A3D62', color:'#fff', border:'none', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit', marginTop:'8px' },
    capBtn: (active: boolean) => ({ flex:1, padding:'14px 8px', textAlign:'center' as const, background: active ? '#E8F4FD' : '#fff', border: active ? '2px solid #2E86C1' : '2px solid #E5E7EB', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontSize:'14px', fontWeight:700, color: active ? '#0A3D62' : '#6B7280' }),
    togRow: (active: boolean) => ({ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px', background: active ? '#E8F4FD' : '#fff', border: active ? '2px solid #2E86C1' : '2px solid #E5E7EB', borderRadius:'10px', cursor:'pointer', marginBottom:'10px' }),
    togLabel: { fontSize:'14px', fontWeight:700, color:'#111827' },
    togSub: { fontSize:'11px', color:'#6B7280', marginTop:'2px' },
    togSw: (active: boolean) => ({ width:'46px', height:'26px', borderRadius:'13px', background: active ? '#2E86C1' : '#E5E7EB', position:'relative' as const, flexShrink:0 as const, transition:'background .2s' }),
  }

  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <div style={{ fontSize:'20px', fontWeight:700, color:'#fff', marginBottom:'3px' }}>
          船の情報を登録する
        </div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)' }}>
          {step <= 3 ? `STEP ${step} / 3` : '登録完了'}
        </div>
        <div style={styles.headerAfter}></div>
      </div>

      <div style={styles.body}>
        {error && (
          <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', fontSize:'13px', color:'#B91C1C' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>船の名前を教えてください</div>
            <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'20px' }}>あとから変更できます</div>

            <label style={styles.label}>船の名前 <span style={{ background:'#B91C1C', color:'#fff', fontSize:'9px', padding:'1px 5px', borderRadius:'3px', marginLeft:'4px' }}>必須</span></label>
            <input style={styles.input} placeholder="例：海皇丸" value={form.name} onChange={e => update('name', e.target.value)} />

            <label style={styles.label}>船長名 <span style={{ background:'#B91C1C', color:'#fff', fontSize:'9px', padding:'1px 5px', borderRadius:'3px', marginLeft:'4px' }}>必須</span></label>
            <input style={styles.input} placeholder="例：山田 太郎" value={form.captain_name} onChange={e => update('captain_name', e.target.value)} />

            <label style={styles.label}>1回の出船で乗れる最大人数</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'20px' }}>
              {[4,6,8,10].map(n => (
                <button key={n} style={styles.capBtn(form.capacity === n)} onClick={() => update('capacity', n)}>
                  {n}名
                </button>
              ))}
            </div>

            <button style={styles.btn} onClick={() => {
              if(!form.name || !form.captain_name) { setError('船の名前と船長名を入力してください'); return }
              setError(''); setStep(2)
            }}>次へ　→</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>どこから出船しますか？</div>
            <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'20px' }}>乗船客がアクセス方法を確認するために使います</div>

            <label style={styles.label}>都道府県 <span style={{ background:'#B91C1C', color:'#fff', fontSize:'9px', padding:'1px 5px', borderRadius:'3px', marginLeft:'4px' }}>必須</span></label>
            <input style={styles.input} placeholder="例：福岡県" value={form.prefecture} onChange={e => update('prefecture', e.target.value)} />

            <label style={styles.label}>漁港・出船場所の名前 <span style={{ background:'#B91C1C', color:'#fff', fontSize:'9px', padding:'1px 5px', borderRadius:'3px', marginLeft:'4px' }}>必須</span></label>
            <input style={styles.input} placeholder="例：糸島市志摩野北漁港" value={form.port_name} onChange={e => update('port_name', e.target.value)} />

            <label style={styles.label}>最寄り駅・アクセスのメモ</label>
            <input style={styles.input} placeholder="例：筑前前原駅から車で15分" value={form.access} onChange={e => update('access', e.target.value)} />

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={{ ...styles.btn, background:'transparent', color:'#6B7280', border:'2px solid #E5E7EB' }} onClick={() => setStep(1)}>← 戻る</button>
              <button style={styles.btn} onClick={() => {
                if(!form.prefecture || !form.port_name) { setError('都道府県と出船場所を入力してください'); return }
                setError(''); setStep(3)
              }}>次へ　→</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>出船のスタイルを教えてください</div>
            <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'20px' }}>あとから変更できます</div>

            <div style={styles.togRow(form.charter_accepted)} onClick={() => update('charter_accepted', !form.charter_accepted)}>
              <div>
                <div style={styles.togLabel}>貸切（チャーター）も受け付ける</div>
                <div style={styles.togSub}>グループで船を借り切る予約です</div>
              </div>
              <div style={styles.togSw(form.charter_accepted)}>
                <div style={{ position:'absolute', top:'3px', left: form.charter_accepted ? '23px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s' }}></div>
              </div>
            </div>

            <div style={styles.togRow(form.beginner_accepted)} onClick={() => update('beginner_accepted', !form.beginner_accepted)}>
              <div>
                <div style={styles.togLabel}>釣り初心者も受け付ける</div>
                <div style={styles.togSub}>「初心者歓迎」と案内に表示されます</div>
              </div>
              <div style={styles.togSw(form.beginner_accepted)}>
                <div style={{ position:'absolute', top:'3px', left: form.beginner_accepted ? '23px' : '3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s' }}></div>
              </div>
            </div>

            <label style={styles.label}>乗船料金（任意）</label>
            <input style={styles.input} placeholder="例：お一人様 15,000円（エサ・氷代込み）" value={form.price} onChange={e => update('price', e.target.value)} />

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={{ ...styles.btn, background:'transparent', color:'#6B7280', border:'2px solid #E5E7EB' }} onClick={() => setStep(2)}>← 戻る</button>
              <button style={{ ...styles.btn, background: loading ? '#E5E7EB' : '#D4AC0D', color: loading ? '#9CA3AF' : '#0A3D62' }} onClick={handleSubmit} disabled={loading}>
                {loading ? '登録中...' : '登録する　✓'}
              </button>
            </div>
          </div>
        )}
        {/* 登録完了・オンボーディング画面 */}
        {step === 4 && (
          <div style={{ textAlign:'center', paddingTop:'20px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px' }}>🎉</div>
            <div style={{ fontSize:'22px', fontWeight:700, color:'#111827', marginBottom:'10px' }}>
              登録が完了しました！
            </div>
            <div style={{ fontSize:'14px', color:'#6B7280', lineHeight:1.7, marginBottom:'32px' }}>
              次に出船スケジュールを設定してください。<br />
              昼便・夜便の運航日や定員を登録することで<br />
              予約を受け付けられるようになります。
            </div>
            <button
              style={{ ...styles.btn, background:'#D4AC0D', color:'#0A3D62', marginBottom:'12px' }}
              onClick={() => router.push('/dashboard/settings')}
            >
              出船スケジュールを設定する　→
            </button>
            <button
              style={{ ...styles.btn, background:'transparent', color:'#6B7280', border:'2px solid #E5E7EB' }}
              onClick={() => router.push('/dashboard')}
            >
              あとで設定する
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
