/* global React, T, OceanHeader, Field, Input, Button, ErrorBanner */
const { useState: useStateReg } = React;

function RegisterScreen({ onSuccess }) {
  const [step, setStep] = useStateReg(1);
  const [error, setError] = useStateReg('');
  const [loading, setLoading] = useStateReg(false);
  const [form, setForm] = useStateReg({
    name: '', captain_name: '', capacity: 6, prefecture: '', port_name: '',
    access: '', charter_accepted: true, beginner_accepted: true, price: '',
  });
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess && onSuccess(); }, 500);
  };

  const togRow = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 22, borderRadius: 14, marginBottom: 14, cursor: 'pointer', gap: 18,
    background: active ? '#FBF3D4' : '#fff',
    border: `2px solid ${active ? T.gold : T.border}`,
  });
  const togSw = (active) => ({
    width: 72, height: 40, borderRadius: 20,
    background: active ? T.gold : '#D1D5DB',
    position: 'relative', flexShrink: 0, transition: 'background .2s',
  });
  const capBtn = (active) => ({
    flex: 1, padding: '22px 8px', textAlign: 'center', borderRadius: 14,
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 22, fontWeight: 700,
    background: active ? T.oceanPale : '#fff',
    border: `${active ? 3 : 2}px solid ${active ? T.ocean : T.border}`,
    color: active ? T.ocean : T.fg1, minHeight: 80,
  });

  return (
    <div style={{
      minHeight: '100%', background: T.bg, fontFamily: T.font,
      maxWidth: 480, margin: '0 auto',
    }}>
      <OceanHeader title="船の情報を登録する" sub={`STEP ${step} / 3`}/>

      <div style={{ padding: '28px 22px' }}>
        <ErrorBanner>{error}</ErrorBanner>

        {step === 1 && (
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.fg1, marginBottom: 10, lineHeight: 1.3 }}>船の名前を<br/>教えてください</div>
            <div style={{ fontSize: 18, color: T.fg2, marginBottom: 28, lineHeight: 1.6 }}>あとから変更できます。</div>

            <Field label="船の名前" required>
              <Input placeholder="例：海皇丸" value={form.name} onChange={e => update('name', e.target.value)}/>
            </Field>
            <Field label="船長名" required>
              <Input placeholder="例：山田 太郎" value={form.captain_name} onChange={e => update('captain_name', e.target.value)}/>
            </Field>
            <Field label="1回の出船で乗れる最大人数">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[4, 6, 8, 10].map(n => (
                  <button key={n} style={capBtn(form.capacity === n)} onClick={() => update('capacity', n)}>{n}名</button>
                ))}
              </div>
            </Field>

            <div style={{ marginTop: 28 }}>
              <Button onClick={() => {
                if (!form.name || !form.captain_name) { setError('船の名前と船長名を入力してください'); return; }
                setError(''); setStep(2);
              }}>次へ　→</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.fg1, marginBottom: 10, lineHeight: 1.3 }}>どこから<br/>出船しますか？</div>
            <div style={{ fontSize: 18, color: T.fg2, marginBottom: 28, lineHeight: 1.6 }}>乗船客がアクセス方法を確認するために使います。</div>

            <Field label="都道府県" required>
              <Input placeholder="例：福岡県" value={form.prefecture} onChange={e => update('prefecture', e.target.value)}/>
            </Field>
            <Field label="漁港・出船場所の名前" required>
              <Input placeholder="例：糸島市志摩野北漁港" value={form.port_name} onChange={e => update('port_name', e.target.value)}/>
            </Field>
            <Field label="最寄り駅・アクセスのメモ">
              <Input placeholder="例：筑前前原駅から車で15分" value={form.access} onChange={e => update('access', e.target.value)}/>
            </Field>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button kind="ghost" onClick={() => setStep(1)}>← 戻る</Button>
              <Button onClick={() => {
                if (!form.prefecture || !form.port_name) { setError('都道府県と出船場所を入力してください'); return; }
                setError(''); setStep(3);
              }}>次へ　→</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.fg1, marginBottom: 10, lineHeight: 1.3 }}>出船の<br/>スタイルを教えてください</div>
            <div style={{ fontSize: 18, color: T.fg2, marginBottom: 28, lineHeight: 1.6 }}>あとから変更できます。</div>

            <div style={togRow(form.charter_accepted)} onClick={() => update('charter_accepted', !form.charter_accepted)}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.fg1, lineHeight: 1.3 }}>貸切（チャーター）も<br/>受け付ける</div>
                <div style={{ fontSize: 16, color: T.fg2, marginTop: 8, lineHeight: 1.5 }}>グループで船を借り切る予約です</div>
              </div>
              <div style={togSw(form.charter_accepted)}>
                <div style={{
                  position: 'absolute', top: 4, left: form.charter_accepted ? 36 : 4,
                  width: 32, height: 32, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 2px 6px rgba(0,0,0,.25)', transition: 'left .2s',
                }}/>
              </div>
            </div>

            <div style={togRow(form.beginner_accepted)} onClick={() => update('beginner_accepted', !form.beginner_accepted)}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.fg1, lineHeight: 1.3 }}>釣り初心者も<br/>受け付ける</div>
                <div style={{ fontSize: 16, color: T.fg2, marginTop: 8, lineHeight: 1.5 }}>「初心者歓迎」と案内に表示されます</div>
              </div>
              <div style={togSw(form.beginner_accepted)}>
                <div style={{
                  position: 'absolute', top: 4, left: form.beginner_accepted ? 36 : 4,
                  width: 32, height: 32, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 2px 6px rgba(0,0,0,.25)', transition: 'left .2s',
                }}/>
              </div>
            </div>

            <Field label="乗船料金（任意）">
              <Input placeholder="例：お一人様 15,000円"
                     value={form.price} onChange={e => update('price', e.target.value)}/>
            </Field>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button kind="ghost" onClick={() => setStep(2)}>← 戻る</Button>
              <Button kind="accent" onClick={submit} disabled={loading}>
                {loading ? '登録中...' : '登録する　✓'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.RegisterScreen = RegisterScreen;
