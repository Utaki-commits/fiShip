/* global React, T, AnchorTile, Button, Field, Input, ErrorBanner */
const { useState: useStateLogin } = React;

function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useStateLogin('yamada@example.com');
  const [password, setPassword] = useStateLogin('');
  const [loading, setLoading] = useStateLogin(false);
  const [error, setError] = useStateLogin('');

  const submit = () => {
    setError('');
    if (!email || !password) {
      setError('メールアドレスまたはパスワードが正しくありません');
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); onSuccess && onSuccess(); }, 500);
  };

  return (
    <main style={{
      minHeight: '100%', background: T.oceanGradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      position: 'relative', overflow: 'hidden', isolation: 'isolate',
    }}>
      {/* horizon glint */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1, zIndex: 2,
        background: 'linear-gradient(90deg,transparent 0%,rgba(242,199,68,.55) 30%,rgba(242,199,68,.85) 50%,rgba(242,199,68,.55) 70%,transparent 100%)',
      }}/>
      <svg viewBox="0 0 700 60" preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
                 width: '100%', height: 60, opacity: 0.55, pointerEvents: 'none', zIndex: 1 }}>
        <path d="M0 36 Q 90 24, 180 36 T 360 36 T 540 36 T 720 36 V60 H0 Z" fill="rgba(46,134,193,.30)"/>
        <path d="M0 46 Q 90 36, 180 46 T 360 46 T 540 46 T 720 46 V60 H0 Z" fill="rgba(46,134,193,.50)"/>
      </svg>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 28px',
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 3,
        boxShadow: '0 20px 50px -20px rgba(4,25,43,.55)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <AnchorTile size={84}/>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.fg1, lineHeight: 1.2 }}>遊漁船予約システム</div>
          <div style={{ fontSize: 18, color: T.fg2, marginTop: 10, fontWeight: 600 }}>船長ログイン</div>
        </div>

        <ErrorBanner>{error}</ErrorBanner>

        <Field label="メールアドレス">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                 placeholder="例：yamada@example.com"/>
        </Field>

        <div style={{ marginBottom: 28 }}>
          <Field label="パスワード">
            <Input type="password" value={password}
                   onChange={e => setPassword(e.target.value)} placeholder="パスワードを入力"/>
          </Field>
        </div>

        <Button onClick={submit} disabled={loading}>
          {loading ? 'ログイン中...' : 'ログインする'}
        </Button>
      </div>
    </main>
  );
}

window.LoginScreen = LoginScreen;
