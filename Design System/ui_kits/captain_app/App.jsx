/* global React, ReactDOM, LoginScreen, RegisterScreen, DashboardScreen */
const { useState: useStateApp } = React;

const DEMO_VESSEL = {
  name: '海皇丸',
  captain_name: '山田 太郎',
  capacity: 8,
};

function App() {
  const [route, setRoute] = useStateApp('login'); // login | register | dashboard
  const [vessel, setVessel] = useStateApp(null);

  // simulated auth flow
  const onLogin = () => setRoute(vessel ? 'dashboard' : 'register');
  const onRegistered = () => { setVessel(DEMO_VESSEL); setRoute('dashboard'); };
  const onLogout = () => { setVessel(null); setRoute('login'); };

  let screen = null;
  if (route === 'login')        screen = <LoginScreen onSuccess={onLogin}/>;
  else if (route === 'register') screen = <RegisterScreen onSuccess={onRegistered}/>;
  else                          screen = <DashboardScreen vessel={vessel || DEMO_VESSEL} onLogout={onLogout}/>;

  // route switcher (kit-only chrome)
  return (
    <div data-screen-label={`captain · ${route}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, padding: 6, background: '#1E5F8E',
        borderRadius: 99, zIndex: 100, fontFamily: "'Noto Sans JP',sans-serif",
        boxShadow: '0 8px 24px rgba(15,69,112,.4)',
      }}>
        {[['login','ログイン'],['register','登録'],['dashboard','管理']].map(([r, label]) => (
          <button key={r} onClick={() => { if (r === 'dashboard' && !vessel) setVessel(DEMO_VESSEL); setRoute(r); }}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 700,
              background: route === r ? '#D4AC0D' : 'transparent',
              color: route === r ? '#1E5F8E' : '#fff',
              border: 'none', borderRadius: 99, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>{label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {screen}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
