/* global React, T, TopBar, Pill */
const { useState: useStateDash } = React;

/* Mock booking dataset — typical week of a busy small charter. */
const SEED_BOOKINGS = [
  { id: 'b1', date: '2026-04-01', name: '田中 健一',  count: 4, fishing_style: 'サビキ釣り',     tel: '090-1234-5678', status: 'confirmed' },
  { id: 'b2', date: '2026-04-03', name: '佐藤 美咲',  count: 2, fishing_style: 'ジギング',         tel: '080-2345-6789', status: 'confirmed' },
  { id: 'b3', date: '2026-04-04', name: '鈴木 大輔',  count: 6, fishing_style: '貸切（タイラバ）', tel: '070-3456-7890', status: 'confirmed' },
  { id: 'b4', date: '2026-04-04', name: '高橋 拓也',  count: 2, fishing_style: 'サビキ釣り',       tel: '090-4567-8901', status: 'confirmed' },
  { id: 'b5', date: '2026-04-06', name: '伊藤 翔',    count: 3, fishing_style: 'タイラバ',         tel: '080-5678-9012', status: 'pending' },
  { id: 'b6', date: '2026-04-07', name: '渡辺 修一',  count: 3, fishing_style: 'エギング',         tel: '070-6789-0123', status: 'confirmed' },
  { id: 'b7', date: '2026-04-10', name: '中村 隆',    count: 6, fishing_style: '貸切',             tel: '090-7890-1234', status: 'pending' },
  { id: 'b8', date: '2026-04-15', name: '小林 直樹',  count: 4, fishing_style: 'サビキ釣り',       tel: '080-8901-2345', status: 'confirmed' },
  { id: 'b9', date: '2026-04-22', name: '加藤 光',    count: 2, fishing_style: 'ジギング',         tel: '070-9012-3456', status: 'pending' },
];

function DashboardScreen({ vessel, onLogout }) {
  const [bookings, setBookings] = useStateDash(SEED_BOOKINGS);
  const [calY, setCalY] = useStateDash(2026);
  const [calM, setCalM] = useStateDash(3); // April (0-indexed)
  const [selDate, setSelDate] = useStateDash(null);

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dayNames = ['日','月','火','水','木','金','土'];

  const forDate = d => bookings.filter(b => b.date === d);
  const pendingTotal = bookings.filter(b => b.status === 'pending').length;
  const setStatus = (id, status) => setBookings(p => p.map(b => b.id === id ? { ...b, status } : b));

  const fd = new Date(calY, calM, 1).getDay();
  const tot = new Date(calY, calM + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < fd; i++) cells.push(<div key={`e${i}`}/>);
  for (let d = 1; d <= tot; d++) {
    const dateStr = `${calY}-${String(calM + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayBookings = forDate(dateStr);
    const hasPending = dayBookings.some(b => b.status === 'pending');
    const totalCount = dayBookings.reduce((s, b) => s + b.count, 0);
    const isFull = totalCount >= (vessel.capacity - 2) && totalCount > 0;
    const isToday = (calY === 2026 && calM === 3 && d === 6);
    const isSel = selDate === dateStr;
    const dow = (fd + d - 1) % 7;

    let bodyBg = T.bg, binFg = T.ocean, mainText = '';
    if (dayBookings.length > 0) {
      if (hasPending) { bodyBg = T.pendBg; binFg = T.pendFg; mainText = '承認待'; }
      else if (isFull) { bodyBg = T.redBg; binFg = T.red; mainText = totalCount >= vessel.capacity ? '満員' : `${totalCount}名`; }
      else { bodyBg = T.oceanPale; binFg = T.ocean; mainText = `${totalCount}名`; }
    }

    cells.push(
      <div key={d} onClick={() => setSelDate(isSel ? null : dateStr)}
        style={{
          borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          cursor: 'pointer', minHeight: 84,
          border: `3px solid ${isSel ? T.ocean : isToday ? T.gold : 'transparent'}`,
          background: isSel ? T.oceanPale : 'transparent',
          transition: 'all .2s',
        }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px', background: 'rgba(255,255,255,0.85)',
        }}>
          <span style={{
            fontSize: 18, fontWeight: 700, lineHeight: 1,
            color: dow === 0 ? T.red : dow === 6 ? T.oceanLight : T.fg1,
          }}>{d}</span>
          {hasPending && <div style={{ width: 10, height: 10, borderRadius: '50%', background: T.pendDot }}/>}
        </div>
        <div style={{ flex: 1, background: bodyBg, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', padding: 4, gap: 2 }}>
          {dayBookings.length > 0 && (<>
            <span style={{ fontSize: 13, fontWeight: 700, color: binFg, lineHeight: 1 }}>昼便</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: binFg, lineHeight: 1 }}>{mainText}</span>
          </>)}
        </div>
      </div>
    );
  }

  const selectedBookings = selDate ? forDate(selDate) : [];

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100%',
                  background: T.bg, fontFamily: T.font }}>
      <TopBar vesselName={vessel.name} captain={vessel.captain_name}
              pending={pendingTotal} onLogout={onLogout}/>

      <div style={{ padding: 16 }}>
        {/* calendar card */}
        <div style={{ background: '#fff', border: `1px solid ${T.border}`,
                      borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => calM === 0 ? (setCalM(11), setCalY(y => y - 1)) : setCalM(m => m - 1)}
              aria-label="前の月"
              style={{ width: 56, height: 56, borderRadius: 14, background: T.bg,
                       border: `2px solid ${T.border}`, cursor: 'pointer', fontSize: 22, fontWeight:700, color: T.ocean, fontFamily:'inherit' }}>◀</button>
            <span style={{ fontSize: 26, fontWeight: 700, color: T.fg1 }}>{calY}年{monthNames[calM]}</span>
            <button onClick={() => calM === 11 ? (setCalM(0), setCalY(y => y + 1)) : setCalM(m => m + 1)}
              aria-label="次の月"
              style={{ width: 56, height: 56, borderRadius: 14, background: T.bg,
                       border: `2px solid ${T.border}`, cursor: 'pointer', fontSize: 22, fontWeight:700, color: T.ocean, fontFamily:'inherit' }}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
            {dayNames.map((d, i) => (
              <div key={d} style={{
                fontSize: 16, fontWeight: 700, textAlign: 'center', padding: '8px 0',
                color: i === 0 ? T.red : i === 6 ? T.oceanLight : T.fg2,
              }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>{cells}</div>
        </div>

        {/* day-detail card */}
        {selDate && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`,
                        borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(180deg,#1E5F8E 0%,#0F4570 100%)', padding: '18px 22px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                {new Date(selDate).getMonth() + 1}月{new Date(selDate).getDate()}日の予約
              </span>
              <button aria-label="閉じる" onClick={() => setSelDate(null)}
                style={{ width:44, height:44, borderRadius:10, background:'rgba(255,255,255,.12)', color:'#fff', fontSize:20, fontFamily:'inherit', cursor:'pointer', border:'none' }}>✕</button>
            </div>

            {selectedBookings.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: T.fg2, fontSize: 18, fontWeight: 600 }}>予約はありません</div>
            ) : selectedBookings.map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '20px 22px', borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.fg1, lineHeight: 1.2 }}>{b.name} さま</div>
                  <div style={{ fontSize: 16, color: T.fg2, marginTop: 6, lineHeight: 1.5 }}>
                    {b.count}名 / {b.fishing_style}<br/>{b.tel}
                  </div>
                </div>
                {b.status === 'pending' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => setStatus(b.id, 'confirmed')} style={{
                      padding: '12px 18px', fontSize: 18, fontWeight: 700, fontFamily: 'inherit',
                      background: T.okBg, color: T.okFg, border: `2px solid ${T.okBd}`,
                      borderRadius: 10, cursor: 'pointer', minHeight: 50,
                    }}>承認</button>
                    <button onClick={() => setStatus(b.id, 'rejected')} style={{
                      padding: '12px 18px', fontSize: 18, fontWeight: 700, fontFamily: 'inherit',
                      background: '#fff', color: T.red, border: `2px solid ${T.redBd}`,
                      borderRadius: 10, cursor: 'pointer', minHeight: 50,
                    }}>お断り</button>
                  </div>
                ) : b.status === 'confirmed' ? (
                  <Pill kind="ok">承認済み</Pill>
                ) : (
                  <Pill kind="decline">お断り</Pill>
                )}
              </div>
            ))}
          </div>
        )}

        {!selDate && (
          <div style={{ background: '#fff', border: `1px solid ${T.border}`,
                        borderRadius: 16, padding: 28, textAlign: 'center', color: T.fg1, fontSize: 20, fontWeight: 600, lineHeight: 1.5 }}>
            日付をタップして<br/>予約をご確認ください
          </div>
        )}
      </div>
    </div>
  );
}

window.DashboardScreen = DashboardScreen;
