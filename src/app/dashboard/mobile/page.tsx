'use client'

type Reservation = {
  id: string
  name: string
  count: number
  binType: 'day' | 'night'
  status: 'confirmed' | 'pending'
}

const reservations: Reservation[] = [
  { id: '1', name: '佐藤 健一', count: 3, binType: 'day', status: 'confirmed' },
  { id: '2', name: '田中 正雄', count: 2, binType: 'night', status: 'pending' },
]

export default function MobileDashboardPage() {
  const totalPassengers = reservations.reduce((sum, r) => sum + r.count, 0)
  const availableSlots = 2

  return (
    <div
      style={{
        maxWidth: '390px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#F7F2EF',
        fontFamily: "'Noto Sans JP', sans-serif",
        lineHeight: 1.7,
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: '#7F1D1D',
          padding: '20px 16px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Radial sun rays pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              repeating-conic-gradient(
                from 0deg at 50% 120%,
                rgba(255,255,255,0.10) 0deg 2deg,
                transparent 2deg 12deg
              )
            `,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Ship name */}
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.03em',
              marginBottom: '4px',
            }}
          >
            第一釣神丸
          </div>

          {/* Date */}
          <div
            style={{
              fontSize: '16px',
              fontWeight: 500,
              color: '#FFFFFF',
              marginBottom: '16px',
            }}
          >
            5月15日（木）
          </div>

          {/* Stat boxes */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            <StatBox number={reservations.length} label="予約" />
            <StatBox number={totalPassengers} label="乗船者" />
            <StatBox number={availableSlots} label="空き" />
          </div>
        </div>
      </header>

      {/* Reservation List */}
      <main style={{ padding: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>

        {/* Add reservation button */}
        <button
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '14px',
            backgroundColor: '#B91C1C',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '9px',
            cursor: 'pointer',
            letterSpacing: '0.03em',
          }}
        >
          ＋ 予約を追加する
        </button>
      </main>
    </div>
  )
}

function StatBox({ number, label }: { number: number; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.13)',
        borderRadius: '8px',
        padding: '12px 8px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '20px',
          fontWeight: 500,
          color: '#FFFFFF',
          lineHeight: 1.2,
        }}
      >
        {number}
      </div>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.03em',
          marginTop: '2px',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const isDay = reservation.binType === 'day'
  const isConfirmed = reservation.status === 'confirmed'

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '0.5px solid #E8DDD8',
        padding: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left side: Name, badge, count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 500,
                color: '#1C1917',
              }}
            >
              {reservation.name}
            </span>
            {/* Badge */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: isDay ? '#DBEAFE' : '#EDE9FE',
                color: isDay ? '#1E3A8A' : '#5B21B6',
                letterSpacing: '0.03em',
              }}
            >
              {isDay ? '昼便' : '夜便'}
            </span>
          </div>

          {/* Count and status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 400,
                color: '#57534E',
              }}
            >
              {reservation.count}名
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: isConfirmed ? '#059669' : '#D97706',
              }}
            >
              {isConfirmed ? '確定済み' : '承認待ち'}
            </span>
          </div>
        </div>

        {/* Right side: Edit button */}
        <button
          style={{
            padding: '14px 20px',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            fontSize: '13px',
            fontWeight: 500,
            border: '0.5px solid #FCA5A5',
            borderRadius: '9px',
            cursor: 'pointer',
            letterSpacing: '0.03em',
          }}
        >
          編集
        </button>
      </div>
    </div>
  )
}
