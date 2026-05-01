import type { ReportStatus, ViolationCategory } from '@/types/database'
import { STATUS_LABELS, STATUS_BADGE, VIOLATION_LABELS, TIER_THRESHOLDS } from './constants'

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60)   return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function statusLabel(status: ReportStatus): string {
  return STATUS_LABELS[status] ?? status
}

export function statusBadgeClass(status: ReportStatus): string {
  return STATUS_BADGE[status] ?? 'badge-default'
}

export function violationLabel(cat: ViolationCategory): string {
  return VIOLATION_LABELS[cat] ?? cat
}

export function tierLabel(points: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (points >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (points >= TIER_THRESHOLDS.gold)     return 'gold'
  if (points >= TIER_THRESHOLDS.silver)   return 'silver'
  return 'bronze'
}

export function nextTierProgress(points: number): { current: string; next: string; progress: number; remaining: number } {
  if (points >= TIER_THRESHOLDS.platinum) {
    return { current: 'platinum', next: 'platinum', progress: 100, remaining: 0 }
  }
  if (points >= TIER_THRESHOLDS.gold) {
    const progress = ((points - TIER_THRESHOLDS.gold) / (TIER_THRESHOLDS.platinum - TIER_THRESHOLDS.gold)) * 100
    return { current: 'gold', next: 'platinum', progress, remaining: TIER_THRESHOLDS.platinum - points }
  }
  if (points >= TIER_THRESHOLDS.silver) {
    const progress = ((points - TIER_THRESHOLDS.silver) / (TIER_THRESHOLDS.gold - TIER_THRESHOLDS.silver)) * 100
    return { current: 'silver', next: 'gold', progress, remaining: TIER_THRESHOLDS.gold - points }
  }
  const progress = (points / TIER_THRESHOLDS.silver) * 100
  return { current: 'bronze', next: 'silver', progress, remaining: TIER_THRESHOLDS.silver - points }
}

export async function computeSHA256(files: File[]): Promise<string> {
  const buffers = await Promise.all(files.map(f => f.arrayBuffer()))
  const combined = new Uint8Array(buffers.reduce((acc, buf) => acc + buf.byteLength, 0))
  let offset = 0
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset)
    offset += buf.byteLength
  }
  const hashBuf = await crypto.subtle.digest('SHA-256', combined)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function formatPlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, ' ').trim()
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
