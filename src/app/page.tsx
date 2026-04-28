export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A3D62',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          background: '#D4AC0D',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
        }}
      >
        ⚓
      </div>
      <h1
        style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: '700',
          margin: 0,
        }}
      >
        遊漁船予約システム
      </h1>
      <p
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: '14px',
          margin: 0,
        }}
      >
        セットアップ完了 ✓
      </p>
    </main>
  )
}
