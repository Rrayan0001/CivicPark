export default function LeaderboardPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 480 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>Civic Park · Leaderboard</p>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 12px' }}>
          Leaderboard coming soon
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          Rankings will appear here once citizens start filing approved reports. Be one of the first to earn a spot.
        </p>
      </div>
    </div>
  )
}
