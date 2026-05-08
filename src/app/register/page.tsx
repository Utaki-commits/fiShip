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

  const oceanGradient =
    'radial-gradient(120% 200% at 88% 110%, rgba(46,134,193,.45) 0%, transparent 55%),' +
    'radial-gradient(80% 120% at 12% -20%, rgba(212,172,13,.18) 0%, transparent 60%),' +
    'linear-gradient(180deg, var(--ocean) 0%, #0F4570 55%, #04192B 100%)'

  const requiredBadge = (
    <span style={{ background: 'var(--status-full-fg)', color: 'var(--surface)', fontSize: '14px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', marginLeft: '8px' }}>
      必須
    </span>
  )

  const styles = {
    shell: { minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--font-sans)', maxWidth:'480px', margin:'0 auto' },
    header: { background:oceanGradient, padding:'32px 22px 48px', position:'relative' as const, overflow:'hidden', isolation:'isolate' as const },
    headerAfter: { position:'absolute' as const, bottom:'-16px', left:0, right:0, height:'32px', background:'var(--bg)', borderRadius:'50% 50% 0 0 / 100% 100% 0 0' },
    title: { fontSize:'28px', fontWeight:700, color:'var(--surface)', marginBottom:'8px', lineHeight:1.25, position:'relative' as const, zIndex:3 },
    sub: { fontSize:'16px', fontWeight:700, letterSpacing:'.08em', color:'rgba(242,199,68,.95)', position:'relative' as const, zIndex:3 },
    body: { padding:'28px 22px' },
    label: { fontSize:'20px', fontWeight:600, color:'var(--fg-1)', marginBottom:'10px', display:'block' },
    input: { width:'100%', padding:'18px 16px', fontSize:'22px', border:'2px solid var(--border)', borderRadius:'12px', outline:'none', fontFamily:'inherit', marginBottom:'22px', minHeight:'64px', background:'var(--surface)', color:'var(--fg-1)' },
    btn: { width:'100%', padding:'20px 26px', fontSize:'24px', fontWeight:600, background:'linear-gradient(180deg,var(--ocean) 0%,#164B73 100%)', color:'var(--surface)', border:'none', borderRadius:'14px', cursor:'pointer', fontFamily:'inherit', marginTop:'8px', minHeight:'64px', boxShadow:'inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 rgba(0,0,0,.18), 0 4px 12px rgba(15,69,112,.30)' },
    capBtn: (active: boolean) => ({ flex:1, padding:'22px 8px', textAlign:'center' as const, background: active ? 'var(--ocean-pale)' : 'var(--surface)', border: active ? '3px solid var(--ocean)' : '2px solid var(--border)', borderRadius:'14px', cursor:'pointer', fontFamily:'inherit', fontSize:'22px', fontWeight:700, color: active ? 'var(--ocean)' : 'var(--fg-1)', minHeight:'80px' }),
    togRow: (active: boolean) => ({ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'18px', padding:'22px', background: active ? '#FBF3D4' : 'var(--surface)', border: active ? '2px solid var(--gold)' : '2px solid var(--border)', borderRadius:'14px', cursor:'pointer', marginBottom:'14px', width:'100%', fontFamily:'inherit', textAlign:'left' as const }),
    togLabel: { fontSize:'20px', fontWeight:700, color:'var(--fg-1)', lineHeight:1.35 },
    togSub: { fontSize:'18px', color:'var(--fg-2)', marginTop:'8px', lineHeight:1.5 },
    togSw: (active: boolean) => ({ width:'72px', height:'40px', borderRadius:'20px', background: active ? 'var(--gold)' : '#D1D5DB', position:'relative' as const, flexShrink:0 as const, transition:'background .2s' }),
  }

  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <div style={{
          position:'absolute', left:0, right:0, top:0, height:'1px', zIndex:2,
          background:'linear-gradient(90deg,transparent 0%,rgba(242,199,68,.55) 30%,rgba(242,199,68,.85) 50%,rgba(242,199,68,.55) 70%,transparent 100%)',
        }} />
        <svg viewBox="0 0 700 44" preserveAspectRatio="none"
          style={{ position:'absolute', left:0, right:0, bottom:'-2px', width:'100%', height:'44px', opacity:0.55, pointerEvents:'none', zIndex:1 }}>
          <path d="M0 27 Q 90 17, 180 27 T 360 27 T 540 27 T 720 27 V44 H0 Z" fill="rgba(46,134,193,.35)" />
          <path d="M0 35 Q 90 27, 180 35 T 360 35 T 540 35 T 720 35 V44 H0 Z" fill="rgba(46,134,193,.55)" />
        </svg>
        <div style={styles.title}>
          船の情報を登録する
        </div>
        <div style={styles.sub}>
          {step <= 3 ? `STEP ${step} / 3` : '登録完了'}
        </div>
        <div style={styles.headerAfter}></div>
      </div>

      <div style={styles.body}>
        {error && (
          <div style={{ background:'var(--status-full-bg)', border:'2px solid var(--status-full-bd)', borderRadius:'12px', padding:'16px 18px', marginBottom:'22px', fontSize:'18px', fontWeight:700, color:'var(--status-full-fg)', lineHeight:1.6 }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'var(--fg-1)', marginBottom:'10px', lineHeight:1.35 }}>船の名前を教えてください</div>
            <div style={{ fontSize:'18px', color:'var(--fg-2)', marginBottom:'28px', lineHeight:1.6 }}>あとから変更できます</div>

            <label style={styles.label}>船の名前 {requiredBadge}</label>
            <input style={styles.input} placeholder="例：海皇丸" value={form.name} onChange={e => update('name', e.target.value)} />

            <label style={styles.label}>船長名 {requiredBadge}</label>
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
            <div style={{ fontSize:'28px', fontWeight:700, color:'var(--fg-1)', marginBottom:'10px', lineHeight:1.35 }}>どこから出船しますか？</div>
            <div style={{ fontSize:'18px', color:'var(--fg-2)', marginBottom:'28px', lineHeight:1.6 }}>乗船客がアクセス方法を確認するために使います</div>

            <label style={styles.label}>都道府県 {requiredBadge}</label>
            <input style={styles.input} placeholder="例：福岡県" value={form.prefecture} onChange={e => update('prefecture', e.target.value)} />

            <label style={styles.label}>漁港・出船場所の名前 {requiredBadge}</label>
            <input style={styles.input} placeholder="例：糸島市志摩野北漁港" value={form.port_name} onChange={e => update('port_name', e.target.value)} />

            <label style={styles.label}>最寄り駅・アクセスのメモ</label>
            <input style={styles.input} placeholder="例：筑前前原駅から車で15分" value={form.access} onChange={e => update('access', e.target.value)} />

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={{ ...styles.btn, background:'transparent', color:'var(--fg-2)', border:'2px solid var(--border)' }} onClick={() => setStep(1)}>← 戻る</button>
              <button style={styles.btn} onClick={() => {
                if(!form.prefecture || !form.port_name) { setError('都道府県と出船場所を入力してください'); return }
                setError(''); setStep(3)
              }}>次へ　→</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'var(--fg-1)', marginBottom:'10px', lineHeight:1.35 }}>出船のスタイルを教えてください</div>
            <div style={{ fontSize:'18px', color:'var(--fg-2)', marginBottom:'28px', lineHeight:1.6 }}>あとから変更できます</div>

            <button type="button" style={styles.togRow(form.charter_accepted)} onClick={() => update('charter_accepted', !form.charter_accepted)}>
              <div>
                <div style={styles.togLabel}>貸切（チャーター）も受け付ける</div>
                <div style={styles.togSub}>グループで船を借り切る予約です</div>
              </div>
              <div style={styles.togSw(form.charter_accepted)}>
                <div style={{ position:'absolute', top:'4px', left: form.charter_accepted ? '36px' : '4px', width:'32px', height:'32px', borderRadius:'50%', background:'var(--surface)', boxShadow:'0 2px 6px rgba(0,0,0,.25)', transition:'left .2s' }}></div>
              </div>
            </button>

            <button type="button" style={styles.togRow(form.beginner_accepted)} onClick={() => update('beginner_accepted', !form.beginner_accepted)}>
              <div>
                <div style={styles.togLabel}>釣り初心者も受け付ける</div>
                <div style={styles.togSub}>「初心者歓迎」と案内に表示されます</div>
              </div>
              <div style={styles.togSw(form.beginner_accepted)}>
                <div style={{ position:'absolute', top:'4px', left: form.beginner_accepted ? '36px' : '4px', width:'32px', height:'32px', borderRadius:'50%', background:'var(--surface)', boxShadow:'0 2px 6px rgba(0,0,0,.25)', transition:'left .2s' }}></div>
              </div>
            </button>

            <label style={styles.label}>乗船料金（任意）</label>
            <input style={styles.input} placeholder="例：お一人様 15,000円（エサ・氷代込み）" value={form.price} onChange={e => update('price', e.target.value)} />

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={{ ...styles.btn, background:'transparent', color:'var(--fg-2)', border:'2px solid var(--border)' }} onClick={() => setStep(2)}>← 戻る</button>
              <button style={{ ...styles.btn, background: loading ? 'var(--border)' : 'linear-gradient(180deg,#E6BD17 0%,#C9A20D 100%)', color: loading ? 'var(--fg-3)' : 'var(--ocean-deep)' }} onClick={handleSubmit} disabled={loading}>
                {loading ? '登録中...' : '登録する　✓'}
              </button>
            </div>
          </div>
        )}
        {/* 登録完了・オンボーディング画面 */}
        {step === 4 && (
          <div style={{ textAlign:'center', paddingTop:'20px' }}>
            <div style={{ width:'84px', height:'84px', borderRadius:'18px', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', fontSize:'40px', color:'var(--ocean)', fontWeight:700 }}>fi</div>
            <div style={{ fontSize:'28px', fontWeight:700, color:'var(--fg-1)', marginBottom:'10px', lineHeight:1.35 }}>
              登録が完了しました！
            </div>
            <div style={{ fontSize:'18px', color:'var(--fg-2)', lineHeight:1.7, marginBottom:'32px' }}>
              次に出船スケジュールを設定してください。<br />
              昼便・夜便の運航日や定員を登録することで<br />
              予約を受け付けられるようになります。
            </div>
            <button
              style={{ ...styles.btn, background:'linear-gradient(180deg,#E6BD17 0%,#C9A20D 100%)', color:'var(--ocean-deep)', marginBottom:'12px' }}
              onClick={() => router.push('/dashboard/settings')}
            >
              出船スケジュールを設定する　→
            </button>
            <button
              style={{ ...styles.btn, background:'transparent', color:'var(--fg-2)', border:'2px solid var(--border)' }}
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



