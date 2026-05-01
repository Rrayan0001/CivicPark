import { z } from 'zod'

export const signUpSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional().or(z.literal('')),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const reportSchema = z.object({
  category: z.enum(['no_parking', 'wrong_parking', 'footpath_parking', 'blocking_traffic', 'double_parking']),
  description: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  captured_at: z.string().datetime(),
  evidence_hash: z.string().length(64, 'Invalid evidence hash'),
})

export const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  detected_plate_override: z.string().optional(),
  rejection_reason: z.enum([
    'plate_not_visible',
    'no_violation_visible',
    'duplicate',
    'edited_image',
    'wrong_location',
    'insufficient_evidence',
    'other',
  ]).optional(),
  reviewer_notes: z.string().max(1000).optional(),
}).refine(
  data => data.action === 'approve' || !!data.rejection_reason,
  { message: 'Rejection reason is required', path: ['rejection_reason'] },
)

export const disputeSchema = z.object({
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  reason: z.string().min(20, 'Please provide at least 20 characters describing your dispute').max(2000),
})

export type SignUpInput  = z.infer<typeof signUpSchema>
export type LoginInput   = z.infer<typeof loginSchema>
export type ReportInput  = z.infer<typeof reportSchema>
export type ReviewInput  = z.infer<typeof reviewSchema>
export type DisputeInput = z.infer<typeof disputeSchema>
