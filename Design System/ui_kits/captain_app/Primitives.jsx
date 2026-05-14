/* global React */
const { useState } = React;

/* fiShip — design tokens lifted from src/app/globals.css + page styles
   Note: `ocean` lifted #0A3D62 → #1E5F8E (clear-water mid-day).
   `oceanDeep` retained for the bottom of the abyssal gradient only. */
const T = {
  ocean: '#1E5F8E', oceanDeep: '#0A3D62',
  oceanLight: '#3FA0D9', oceanPale: '#E8F4FD',
  gold: '#D4AC0D', goldGlint: '#F2C744',
  bg: '#F8F9FA', surface: '#FFFFFF', border: '#E5E7EB',
  fg1: '#111827', fg2: '#6B7280', fg3: '#9CA3AF',
  red: '#B91C1C', redBg: '#FEE2E2', redBd: '#FCA5A5',
  okBg: '#D4EDDA', okFg: '#1B6B3A', okBd: '#86EFAC',
  pendBg: '#FEF9C3', pendFg: '#854D0E', pendDot: '#D97706',
  closedBg: '#F1F5F9',
  font: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
  /* 大海原 — abyss → mid-ocean → horizon glow.
     Note the gradient still terminates in the abyssal deep blue, even
     though the flat brand color has lifted. This keeps the gradient
     reading as DEEP water rather than a flat tint. */
  oceanGradient:
    'radial-gradient(120% 200% at 88% 110%, rgba(46,134,193,.45) 0%, transparent 55%),' +
    'radial-gradient(80% 120% at 12% -20%, rgba(212,172,13,.18) 0%, transparent 60%),' +
    'linear-gradient(180deg, #1E5F8E 0%, #0F4570 55%, #04192B 100%)',
};

/* Reusable wave SVG layer — paste at bottom of dark surfaces */
function Waves({ height = 36, opacity = 0.55 }) {
  return (
    <svg viewBox="0 0 700 36" preserveAspectRatio="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: -2,
               width: '100%', height, opacity, pointerEvents: 'none', zIndex: 1 }}>
      <path d="M0 22 Q 90 14, 180 22 T 360 22 T 540 22 T 720 22 V36 H0 Z" fill="rgba(46,134,193,.35)"/>
      <path d="M0 28 Q 90 22, 180 28 T 360 28 T 540 28 T 720 28 V36 H0 Z" fill="rgba(46,134,193,.55)"/>
    </svg>
  );
}

/* ----------------------------- Brand mark ----------------------------
   Customer-supplied 遊漁船サンライズ logo. Circular composition with
   white background — on dark surfaces it reads as a white seal /
   chop, which is the intended treatment. AnchorTile kept as alias
   so existing call sites keep working. */
function BrandMark({ size = 56 }) {
  return (
    <img
      src="../../assets/brand-mark.png"
      alt="fiShip"
      width={size} height={size}
      style={{ display: 'block', flexShrink: 0,
               width: size, height: size, objectFit: 'contain' }}
    />
  );
}
const AnchorTile = BrandMark;

/* ------------------------------ Buttons -----------------------------
   Visible press feedback: 2px down + inset shadow + darker gradient.
   Implemented as a React component with onPointerDown/Up state because
   :active is unreliable on iOS Safari without -webkit-tap-highlight workarounds. */
function Button({ kind = 'primary', children, onClick, disabled, full = true }) {
  const [pressed, setPressed] = React.useState(false);
  const [hover, setHover] = React.useState(false);

  const base = {
    fontFamily: T.font, fontWeight: 600, fontSize: 22, padding: '20px 26px',
    border: 'none', borderRadius: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: full ? '100%' : 'auto', minHeight: 64,
    userSelect: 'none', WebkitTapHighlightColor: 'transparent',
    transition: 'transform .08s ease, box-shadow .12s ease, background .12s ease, filter .12s ease',
    position: 'relative',
  };

  const variants = {
    primary: {
      rest: {
        background: 'linear-gradient(180deg,#1E5F8E 0%,#164B73 100%)', color: '#fff',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 rgba(0,0,0,.18), 0 4px 12px rgba(15,69,112,.30)',
      },
      pressed: {
        background: 'linear-gradient(180deg,#164B73 0%,#0F4570 100%)', color: '#fff',
        transform: 'translateY(2px)',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,.30), 0 1px 2px rgba(15,69,112,.20)',
      },
    },
    accent: {
      rest: {
        background: 'linear-gradient(180deg,#E6BD17 0%,#C9A20D 100%)', color: '#0A2540',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.45), 0 2px 0 rgba(133,77,14,.45), 0 4px 12px rgba(212,172,13,.32)',
      },
      pressed: {
        background: 'linear-gradient(180deg,#C9A20D 0%,#A6850A 100%)', color: '#0A2540',
        transform: 'translateY(2px)',
        boxShadow: 'inset 0 2px 4px rgba(133,77,14,.45), 0 1px 2px rgba(212,172,13,.20)',
      },
    },
    ghost: {
      rest: {
        background: '#fff', color: '#374151',
        border: '1.5px solid #D1D5DB', boxShadow: '0 1px 0 rgba(17,24,39,.04)',
      },
      pressed: {
        background: '#E5E7EB', color: '#374151',
        border: '1.5px solid #6B7280',
        transform: 'translateY(1px)',
        boxShadow: 'inset 0 2px 4px rgba(17,24,39,.10)',
      },
    },
  };

  if (disabled) {
    return (
      <button style={{ ...base, background: T.border, color: T.fg3, boxShadow: 'none' }}
              disabled>{children}</button>
    );
  }

  const v = variants[kind] || variants.primary;
  const state = pressed ? v.pressed : v.rest;
  const hoverBoost = hover && !pressed ? { filter: 'brightness(1.05)' } : {};

  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      style={{ ...base, ...state, ...hoverBoost }}
    >{children}</button>
  );
}

/* ----------------------- Field (label + input) ---------------------- */
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: T.fg1, marginBottom: 10, display:'flex', alignItems:'center', gap:8 }}>
        {label}
        {required && (
          <span style={{ background: T.red, color: '#fff', fontSize: 14, fontWeight:700, padding: '3px 10px', borderRadius: 6 }}>必須</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input {...props} style={{
      width: '100%', padding: '18px 16px', fontSize: 22, border: `2px solid ${T.border}`,
      borderRadius: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
      minHeight: 64, color: T.fg1,
      ...(props.style || {}),
    }}/>
  );
}

/* ----------------------------- Pills -------------------------------- */
function Pill({ kind, children }) {
  const map = {
    pending: { bg: T.pendDot, fg: '#fff' },
    ok:      { bg: T.okBg, fg: T.okFg },
    decline: { bg: T.closedBg, fg: T.fg2 },
    full:    { bg: T.redBg, fg: T.red },
  };
  const m = map[kind] || map.ok;
  return (
    <span style={{
      display: 'inline-block', fontSize: 16, fontWeight: 700,
      padding: '8px 16px', borderRadius: 99, background: m.bg, color: m.fg,
    }}>{children}</span>
  );
}

/* ------------------------- Sticky top bar --------------------------- */
function TopBar({ vesselName, captain, pending, onLogout }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: T.oceanGradient,
      padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
      overflow: 'hidden', isolation: 'isolate', minHeight: 80,
    }}>
      {/* horizon glint */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1, zIndex: 2,
        background: 'linear-gradient(90deg,transparent 0%,rgba(242,199,68,.55) 30%,rgba(242,199,68,.85) 50%,rgba(242,199,68,.55) 70%,transparent 100%)',
      }}/>
      <Waves/>

      <BrandMark size={56}/>

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 3,
                    display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1.1,
                       whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                       flexShrink: 1, minWidth: 0 }}>
          {vesselName}
        </span>
        <span style={{ color: 'rgba(255,255,255,.32)', fontWeight: 300,
                       fontSize: 28, flexShrink: 0 }}>/</span>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1,
                       minWidth: 0, flexShrink: 1, gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.18em',
                         color: 'rgba(242,199,68,.95)', textTransform: 'uppercase' }}>船長</span>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,.96)',
                         whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
            {captain}
          </span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 3 }}>
        {pending > 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 16px 10px 14px',
            background: 'rgba(212,172,13,.18)',
            border: '2px solid rgba(242,199,68,.55)',
            borderRadius: 99, fontSize: 16, fontWeight: 700, color: T.goldGlint,
            minHeight: 44,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.goldGlint,
                           boxShadow: '0 0 0 4px rgba(242,199,68,.22)' }}/>
            承認待ち {pending}件
          </span>
        )}
        <button onClick={onLogout} aria-label="ログアウト" style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.22)',
          color: 'rgba(255,255,255,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
        }}>⎋</button>
      </div>
    </div>
  );
}

/* ------------------------- Ocean header (with hull cutout) ---------- */
function OceanHeader({ title, sub }) {
  return (
    <div style={{ background: T.oceanGradient, padding: '32px 22px 48px',
                  position: 'relative', overflow: 'hidden', isolation: 'isolate' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1, zIndex: 2,
        background: 'linear-gradient(90deg,transparent 0%,rgba(242,199,68,.55) 30%,rgba(242,199,68,.85) 50%,rgba(242,199,68,.55) 70%,transparent 100%)',
      }}/>
      <Waves height={44}/>
      <div style={{ position: 'relative', zIndex: 3 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.08em', color: 'rgba(242,199,68,.95)' }}>{sub}</div>
      </div>
      <div style={{
        position: 'absolute', bottom: -16, left: 0, right: 0, height: 32, zIndex: 4,
        background: T.bg, borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
      }}/>
    </div>
  );
}

/* ----------------------------- Errors ------------------------------- */
function ErrorBanner({ children }) {
  if (!children) return null;
  return (
    <div style={{
      background: T.redBg, border: `2px solid ${T.redBd}`, borderRadius: 12,
      padding: '16px 18px', marginBottom: 22, fontSize: 18, fontWeight: 700, color: T.red,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span aria-hidden style={{ fontSize: 24 }}>⚠</span>
      <span>{children}</span>
    </div>
  );
}

Object.assign(window, {
  T, Waves, BrandMark, AnchorTile, Button, Field, Input, Pill, TopBar, OceanHeader, ErrorBanner,
});
