import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AnimatedNumber } from './AnimatedNumber'

export const revalidate = 30

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', active: true,  icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { href: '/admin/officers',  label: 'Officers',  active: false, icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 3 2 2 4-4"/></> },
  { href: '/admin/zones',     label: 'Zones',     active: false, icon: <><path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13Z"/><circle cx="12" cy="9" r="3"/></> },
  { href: '/admin/exports',   label: 'Exports',   active: false, icon: <><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M12 12v6M9 15l3 3 3-3"/></> },
]

function DonutRing({ rate }: { rate: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (rate / 100) * circ
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ animation: 'donutSweep 1.2s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="600" fontFamily="var(--font-mono)" fill="var(--ink)">{rate}%</text>
    </svg>
  )
}

function Sparkline({ values, color = 'var(--primary)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 80, h = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.split(' ').at(-1)!.split(',')[0]} cy={pts.split(' ').at(-1)!.split(',')[1]} r="2.5" fill={color} />
    </svg>
  )
}

function TodayPulseStrip({ recent24h }: { recent24h: { created_at: string }[] }) {
  // Create 24 bins for the last 24 hours
  const now = new Date()
  const bins = Array(24).fill(0)
  recent24h.forEach(r => {
    const d = new Date(r.created_at)
    const hoursAgo = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
    if (hoursAgo >= 0 && hoursAgo < 24) {
      bins[23 - hoursAgo]++
    }
  })
  
  const maxBin = Math.max(...bins, 1)
  const recent10Min = recent24h.filter(r => (now.getTime() - new Date(r.created_at).getTime()) < 10 * 60 * 1000).length

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 1px 4px rgba(14,26,43,0.04)' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 4 }}>Today's Pulse</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 99, background: 'var(--status-approved)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>+{recent10Min} in last 10 min</span>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: 40, gap: 4 }}>
        {bins.map((val, i) => (
          <div key={i} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ 
              width: '100%', 
              background: i === 23 ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 30%, var(--surface-2))', 
              height: `${Math.max((val / maxBin) * 100, 5)}%`, 
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.3s ease'
            }} />
          </div>
        ))}
      </div>
      <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>Now</div>
    </div>
  )
}

function SlaCard({ oldestPending }: { oldestPending: { created_at: string } | null }) {
  let oldestMinutes = 0;
  if (oldestPending) {
    oldestMinutes = Math.floor((new Date().getTime() - new Date(oldestPending.created_at).getTime()) / (1000 * 60));
  }
  
  const oldestStr = oldestMinutes > 60 
    ? `${Math.floor(oldestMinutes / 60)}h ${oldestMinutes % 60}m` 
    : `${oldestMinutes}m`;
    
  const isBreached = oldestMinutes > 6 * 60;
  const isWarning = oldestMinutes > 4 * 60;
  
  const statusColor = isBreached ? 'var(--status-rejected)' : isWarning ? '#F59E0B' : 'var(--status-approved)';
  const statusBg = isBreached ? 'var(--status-rejected-bg)' : isWarning ? 'rgba(245, 158, 11, 0.1)' : 'var(--status-approved-bg)';
  
  const progress = Math.min((oldestMinutes / (6 * 60)) * 100, 100);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(14,26,43,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 6 }}>Queue Health</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}>
            Oldest: {oldestPending ? oldestStr : '0m'}
          </div>
        </div>
        <div style={{ 
          background: statusBg, color: statusColor, padding: '4px 8px', borderRadius: 6, 
          fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' 
        }}>
          Target &lt; 6h
        </div>
      </div>
      
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
          <span>0h</span>
          <span>6h Limit</span>
        </div>
        <div style={{ width: '100%', height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ 
            width: `${progress}%`, height: '100%', background: statusColor, borderRadius: 999,
            transition: 'width 1s ease-out'
          }} />
        </div>
      </div>
    </div>
  )
}

function ZoneHeatmap({ hotspots }: { hotspots: { lat: number, lng: number, count: number }[] }) {
  // A simple abstract representation of 6 Bangalore zones using SVG polygons
  // We'll map the density arbitrarily for the visual effect if no real hotspots exist,
  // or use the hotspots data to color them.
  const maxCount = hotspots.length > 0 ? Math.max(...hotspots.map(h => h.count), 1) : 100;
  
  // Fake zones for the abstract map
  const zones = [
    { id: 'north', path: 'M 100 20 L 200 40 L 220 120 L 120 150 L 50 100 Z', center: [130, 80] },
    { id: 'east',  path: 'M 220 120 L 320 100 L 340 200 L 240 250 L 180 180 Z', center: [260, 160] },
    { id: 'south', path: 'M 120 150 L 180 180 L 240 250 L 150 320 L 60 260 Z', center: [150, 240] },
    { id: 'west',  path: 'M 50 100 L 120 150 L 60 260 L 20 200 L 10 140 Z', center: [60, 170] },
    { id: 'central', path: 'M 120 150 L 220 120 L 180 180 Z', center: [170, 150] },
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(14,26,43,0.04)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.05, backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 4 }}>Live Heatmap</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Bangalore Zones</div>
        </div>
        <div style={{ fontSize: 11, display: 'flex', gap: 12, color: 'var(--ink-4)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'color-mix(in srgb, var(--primary) 20%, var(--surface))' }} /> Low</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--primary)' }} /> High</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', placeItems: 'center', marginTop: 10, zIndex: 1 }}>
        <svg viewBox="0 0 350 350" style={{ width: '100%', maxHeight: '220px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.05))' }}>
          {zones.map((z, i) => {
            // Fake density based on index for prototype, or map to hotspots if available
            const density = hotspots.length > 0 ? ((hotspots[i % hotspots.length]?.count || 0) / maxCount) : (0.2 + (i * 0.15));
            const color = `color-mix(in srgb, var(--primary) ${Math.max(density * 100, 10)}%, var(--surface))`;
            return (
              <g key={z.id}>
                <path d={z.path} fill={color} stroke="var(--bg)" strokeWidth="3" style={{ transition: 'fill 0.5s ease' }} />
                {density > 0.5 && (
                  <circle cx={z.center[0]} cy={z.center[1]} r="4" fill="#fff" style={{ animation: 'pulse 2s infinite', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' }} />
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

const STATUS_ICON = {
  approved: <path d="m9 12 2 2 4-4"/>,
  rejected: <path d="m15 9-6 6M9 9l6 6"/>,
  pending:  <path d="M12 5v7l4 2"/>,
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [reportsRes, approvedRes, rejectedRes, pendingRes, citizensRes, officersRes, profileRes, recentRes, oldestPendingRes, recent24hRes, hotspotsRes] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'citizen'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'officer'),
    supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').maybeSingle(),
    supabase.from('reports').select('id, status, category, address, fine_amount, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('reports').select('created_at').eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('reports').select('created_at').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    (supabase.rpc as any)('get_hotspots', { days_back: 1 }),
  ])

  const totalReports  = reportsRes.count  ?? 0
  const totalApproved = approvedRes.count ?? 0
  const totalRejected = rejectedRes.count ?? 0
  const totalPending  = pendingRes.count  ?? 0
  const totalCitizens = citizensRes.count ?? 0
  const totalOfficers = officersRes.count ?? 0
  const approvalRate  = totalReports > 0 ? Math.round((totalApproved / totalReports) * 100) : 0
  const fineCollected = totalApproved * 500

  const adminName     = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Admin'
  const adminInitials = adminName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  type RecentRow = { id: string; status: string; category: string | null; address: string | null; fine_amount: number | null; created_at: string }
  const recentReports = (recentRes.data ?? []) as RecentRow[]
  const oldestPending = oldestPendingRes.data as { created_at: string } | null
  const recent24h = (recent24hRes.data ?? []) as { created_at: string }[]
  const hotspots = (hotspotsRes.data ?? []) as { lat: number, lng: number, count: number }[]

  const sparkReports  = [4, 7, 5, 9, 11, 8, totalReports  || 12]
  const sparkApproved = [2, 5, 4, 7,  8, 6, totalApproved || 9]
  const sparkCitizens = [10,14,13,18,20,17, totalCitizens || 22]
  const sparkOfficers = [2, 2, 3, 3,  4, 4, totalOfficers || 5]

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '244px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(30, 58, 138, 0.4); opacity: 1; }
          70% { box-shadow: 0 0 0 6px rgba(30, 58, 138, 0); opacity: 0.8; }
          100% { box-shadow: 0 0 0 0 rgba(30, 58, 138, 0); opacity: 1; }
        }
        @keyframes donutSweep {
          from { stroke-dasharray: 0 200; }
        }
        @keyframes highlightFade {
          0% { background-color: var(--primary-soft); }
          100% { background-color: transparent; }
        }
      `}} />

      {/* ── Sidebar ── */}
      <aside style={{
        background: 'var(--surface)', borderRight: '1px solid var(--line)', padding: '18px 14px',
        display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', position: 'sticky', top: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 18px', borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--primary) 0%, #3B5FCF 100%)',
            color: '#fff', display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
            boxShadow: '0 2px 8px rgba(30,58,138,0.35)',
          }}>CP</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Civic Park</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Admin Console</div>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-5)', padding: '10px 10px 4px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Operations</div>

        {ADMIN_NAV.map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
            fontSize: 13.5, color: item.active ? 'var(--primary)' : 'var(--ink-2)',
            fontWeight: item.active ? 600 : 500,
            background: item.active ? 'var(--primary-soft)' : 'transparent',
            textDecoration: 'none',
            boxShadow: item.active ? 'inset 0 0 0 1px rgba(30,58,138,0.12)' : 'none',
            transition: 'background 120ms ease, color 120ms ease',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            {item.label}
            {item.active && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: 99, background: 'var(--primary)', opacity: 0.7 }} />}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ borderTop: '1px solid var(--line)', padding: '12px 10px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Reports', value: totalReports },
              { label: 'Officers', value: totalOfficers },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 9.5, color: 'var(--ink-4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginTop: 2 }}><AnimatedNumber value={s.value} /></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 0', borderTop: '1px solid var(--line)' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 999,
              background: 'linear-gradient(135deg, var(--primary) 0%, #6B82D0 100%)',
              color: '#fff', display: 'grid', placeItems: 'center',
              fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>{adminInitials}</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{adminName}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 56, borderBottom: '1px solid var(--line)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
          position: 'sticky', top: 0, zIndex: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            <span>Admin</span><span style={{ opacity: 0.4 }}>›</span><strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Dashboard</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, background: 'var(--status-approved-bg)', padding: '4px 10px', borderRadius: 999 }}>
            <span style={{
              width: 7, height: 7, borderRadius: 99, background: 'var(--status-approved)',
              animation: 'pulse 2s infinite', display: 'inline-block',
            }} />
            <span style={{ fontSize: 11, color: 'var(--status-approved)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>LIVE</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c-1.5 0-2.5-2-2.5-2a3 3 0 1 0-6 0s-1 2-2.5 2"/><path d="M12 15V3"/><path d="M12 3a2 2 0 0 1 2 2v2"/><path d="M12 3a2 2 0 0 0-2 2v2"/></svg>
            28°C · AQI 142
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12, color: 'var(--ink-4)', marginRight: 12, cursor: 'text' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Search... <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 4px', background: 'var(--surface)', borderRadius: 4, marginLeft: 16 }}>⌘K</kbd>
            </div>
            <Link href="/admin/officers" className="btn btn-secondary btn-sm">+ Add officer</Link>
          </div>
        </div>

        <div style={{ padding: '28px 32px 80px' }}>
          {/* Page header */}
          <div style={{ marginBottom: 28, position: 'relative' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, opacity: 0.05, pointerEvents: 'none' }}>
              <svg width="200" height="100" viewBox="0 0 200 100">
                <path d="M0,50 Q50,0 100,50 T200,50" fill="none" stroke="var(--ink)" strokeWidth="2" />
                <path d="M0,70 Q50,20 100,70 T200,70" fill="none" stroke="var(--ink)" strokeWidth="1" />
              </svg>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {greeting}, {adminName.split(' ')[0]}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>Operations Command Center</h1>
            <div style={{ color: 'var(--ink-4)', marginTop: 4, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              Bangalore · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <TodayPulseStrip recent24h={recent24h} />

          {/* ── KPI grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {([
              {
                label: 'Reports Filed', value: totalReports, sub: 'all time', spark: sparkReports, color: 'var(--primary)',
                icon: <><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/><path d="M10 11l2 2 4-4"/></>,
              },
              {
                label: 'Approved', value: totalApproved, sub: `${approvalRate}% approval rate`, spark: sparkApproved, color: 'var(--status-approved)',
                icon: <><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>,
              },
              {
                label: 'Active Citizens', value: totalCitizens, sub: 'registered users', spark: sparkCitizens, color: '#7C5CBF',
                icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
              },
              {
                label: 'Officers', value: totalOfficers, sub: 'on roster', spark: sparkOfficers, color: '#B07120',
                icon: <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 3 2 2 4-4"/></>,
              },
            ] as const).map(s => (
              <div key={s.label} style={{
                padding: '18px 20px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
                display: 'flex', flexDirection: 'column', gap: 0, boxShadow: '0 1px 4px rgba(14,26,43,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {s.icon}
                    </svg>
                  </div>
                  <Sparkline values={s.spark} color={s.color} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  <AnimatedNumber value={s.value} />
                </div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 6, fontWeight: 600 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 11.5, marginTop: 3, color: 'var(--ink-4)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Second row: Map + SLA + Fine estimate ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr', gap: 14, marginBottom: 24 }}>
            <ZoneHeatmap hotspots={hotspots} />
            <SlaCard oldestPending={oldestPending} />
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 1px 4px rgba(14,26,43,0.04)' }}>
              <DonutRing rate={approvalRate} />
              <div>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 6 }}>Approval Rate</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}>{approvalRate}%</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
                  {totalApproved} of {totalReports} reports
                </div>
              </div>
            </div>
          </div>

          {/* ── Activity feed & Leaderboard ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            {/* Activity feed */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(14,26,43,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Live Feed</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Incoming operations</div>
                </div>
                <Link href="/admin/officers" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>

              {recentReports.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ink-4)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5Z"/></svg>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>No reports yet</div>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 34, top: 0, bottom: 0, width: 1, background: 'var(--line)', zIndex: 0 }} />
                  {recentReports.map((item, i) => {
                    const statusMeta = {
                      approved: { bg: 'var(--status-approved-bg)', color: 'var(--status-approved)', label: 'Approved' },
                      rejected: { bg: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', label: 'Rejected' },
                      pending:  { bg: 'var(--status-pending-bg)',  color: 'var(--status-pending)',  label: 'Pending'  },
                    }[item.status] ?? { bg: 'var(--surface-2)', color: 'var(--ink-3)', label: item.status }
                    const icon = STATUS_ICON[item.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending

                    return (
                      <div key={item.id} style={{
                        display: 'flex', gap: 16, padding: '14px 22px',
                        borderBottom: i < recentReports.length - 1 ? '1px dashed var(--line)' : 'none',
                        position: 'relative', zIndex: 1,
                        animation: 'fadeUp 0.4s ease both, highlightFade 3s ease',
                        animationDelay: `${i * 80}ms`,
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7, background: statusMeta.bg,
                          border: `1.5px solid ${statusMeta.color}`,
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                          color: statusMeta.color, zIndex: 2,
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink)' }}>{item.id.slice(0, 8).toUpperCase()}</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 999,
                              background: statusMeta.bg, color: statusMeta.color, fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}><span style={{ width: 5, height: 5, borderRadius: 99, background: 'currentColor', flexShrink: 0 }} />{statusMeta.label}</span>
                            {item.category && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.category.replace('_', ' ')}</span>}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 4, display: 'flex', gap: 12 }}>
                            <span>{item.address ?? '—'}</span>
                            <span style={{ opacity: 0.5 }}>·</span>
                            <span>{new Date(item.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Fines Card (Dark Institutional gradient) */}
            <div style={{
              background: 'linear-gradient(135deg, #0E1A2B 0%, #1E3A8A 100%)',
              border: '1px solid rgba(30,58,138,0.4)', borderRadius: 12, padding: '24px',
              color: '#fff', boxShadow: '0 4px 24px rgba(14,26,43,0.3)',
              display: 'flex', flexDirection: 'column', height: 'fit-content'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.8, marginBottom: 20 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Est. Collections</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.04em' }}>
                ₹<AnimatedNumber value={fineCollected} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Based on ₹500 avg</span>
                <span>{totalApproved} approved</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 24, padding: '10px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, opacity: 0.9 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                Not reconciled with Treasury
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
