import type { ViolationCategory, ReportStatus } from '@/types/database'

export const VIOLATION_LABELS: Record<ViolationCategory, string> = {
  no_parking:        'No Parking Zone',
  wrong_parking:     'Wrong Parking',
  footpath_parking:  'Footpath Parking',
  blocking_traffic:  'Blocking Traffic',
  double_parking:    'Double Parking',
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending_ai:                 'Processing',
  pending_review:             'Awaiting Review',
  approved:                   'Approved',
  rejected:                   'Rejected',
  challan_issued:             'Challan Issued',
  auto_rejected_duplicate:    'Duplicate',
  auto_rejected_low_quality:  'Low Quality',
  disputed:                   'Disputed',
}

export const STATUS_BADGE: Record<ReportStatus, string> = {
  pending_ai:                 'badge-default',
  pending_review:             'badge-pending',
  approved:                   'badge-success',
  rejected:                   'badge-error',
  challan_issued:             'badge-success',
  auto_rejected_duplicate:    'badge-error',
  auto_rejected_low_quality:  'badge-error',
  disputed:                   'badge-info',
}

export const FINE_AMOUNTS: Record<ViolationCategory, number> = {
  no_parking:        500,
  wrong_parking:     300,
  footpath_parking:  500,
  blocking_traffic:  1000,
  double_parking:    300,
}

export const TIER_THRESHOLDS = {
  bronze:   0,
  silver:   50,
  gold:     200,
  platinum: 1000,
} as const

export const POINTS_PER_APPROVAL = 5

export const MIN_PHOTOS = 2
export const MAX_PHOTOS = 4
export const MAX_VIDEO_SECONDS = 10

export const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
