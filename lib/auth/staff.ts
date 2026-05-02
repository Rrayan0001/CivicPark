import type { Database } from '@/types/database'

export type StaffRole = Extract<Database['public']['Enums']['user_role'], 'admin' | 'officer'>

export type StaffProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'role' | 'staff_verified' | 'staff_suspended'
>

export function isStaffRole(role: Database['public']['Enums']['user_role']): role is StaffRole {
  return role === 'admin' || role === 'officer'
}

export function hasVerifiedStaffAccess(profile: StaffProfile | null | undefined, allowedRoles?: StaffRole[]) {
  if (!profile || !isStaffRole(profile.role)) return false
  if (allowedRoles && !allowedRoles.includes(profile.role)) return false
  return profile.staff_verified && !profile.staff_suspended
}
