// Auto-generated from Supabase schema.
// Regenerate with: supabase gen types typescript --local > types/database.ts
// This is a placeholder — run the command above after `supabase start`

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'citizen' | 'officer' | 'admin'
          full_name: string | null
          phone: string | null
          aadhaar_verified: boolean
          total_reports: number
          approved_reports: number
          reward_points: number
          tier: string
          is_banned: boolean
          ban_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'citizen' | 'officer' | 'admin'
          full_name?: string | null
          phone?: string | null
          aadhaar_verified?: boolean
          total_reports?: number
          approved_reports?: number
          reward_points?: number
          tier?: string
          is_banned?: boolean
          ban_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          category: 'no_parking' | 'wrong_parking' | 'footpath_parking' | 'blocking_traffic' | 'double_parking'
          description: string | null
          location: unknown
          address: string | null
          ward: string | null
          status: 'pending_ai' | 'pending_review' | 'approved' | 'rejected' | 'challan_issued' | 'auto_rejected_duplicate' | 'auto_rejected_low_quality' | 'disputed'
          photo_urls: string[]
          video_url: string | null
          captured_at: string
          device_metadata: Json | null
          ai_processed_at: string | null
          detected_plate: string | null
          plate_confidence: number | null
          perceptual_hashes: string[] | null
          duplicate_of: string | null
          ai_flags: Json | null
          reviewer_id: string | null
          reviewed_at: string | null
          rejection_reason: 'plate_not_visible' | 'no_violation_visible' | 'duplicate' | 'edited_image' | 'wrong_location' | 'insufficient_evidence' | 'other' | null
          reviewer_notes: string | null
          challan_id: string | null
          challan_issued_at: string | null
          fine_amount: number | null
          fine_paid: boolean
          section_65b_certificate_url: string | null
          evidence_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          category: 'no_parking' | 'wrong_parking' | 'footpath_parking' | 'blocking_traffic' | 'double_parking'
          description?: string | null
          location: unknown
          address?: string | null
          ward?: string | null
          status?: 'pending_ai' | 'pending_review' | 'approved' | 'rejected' | 'challan_issued' | 'auto_rejected_duplicate' | 'auto_rejected_low_quality' | 'disputed'
          photo_urls: string[]
          video_url?: string | null
          captured_at: string
          device_metadata?: Json | null
          evidence_hash: string
        }
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
      report_audit_log: {
        Row: {
          id: string
          report_id: string
          actor_id: string | null
          action: string
          from_status: string | null
          to_status: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: never
        Update: never
      }
      disputes: {
        Row: {
          id: string
          report_id: string
          contact_email: string
          contact_phone: string | null
          reason: string
          resolved: boolean
          resolved_at: string | null
          resolution_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          contact_email: string
          contact_phone?: string | null
          reason: string
          resolved?: boolean
          resolved_at?: string | null
          resolution_notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['disputes']['Insert']>
      }
      no_parking_zones: {
        Row: {
          id: string
          name: string | null
          area: unknown
          source: string | null
          confidence: number | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          area: unknown
          source?: string | null
          confidence?: number | null
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['no_parking_zones']['Insert']>
      }
    }
    Views: {
      leaderboard: {
        Row: {
          id: string
          full_name: string | null
          tier: string | null
          approved_reports: number | null
          reward_points: number | null
          rank: number | null
        }
      }
    }
    Functions: {
      get_hotspots: {
        Args: { days_back?: number }
        Returns: Array<{ lat: number; lng: number; count: number }>
      }
      find_potential_duplicates: {
        Args: {
          p_plate: string
          p_lat: number
          p_lng: number
          p_captured: string
          p_report_id?: string
        }
        Returns: Array<{
          id: string
          detected_plate: string
          distance_m: number
          time_diff_s: number
        }>
      }
    }
    Enums: {
      user_role: 'citizen' | 'officer' | 'admin'
      violation_category: 'no_parking' | 'wrong_parking' | 'footpath_parking' | 'blocking_traffic' | 'double_parking'
      report_status: 'pending_ai' | 'pending_review' | 'approved' | 'rejected' | 'challan_issued' | 'auto_rejected_duplicate' | 'auto_rejected_low_quality' | 'disputed'
      rejection_reason: 'plate_not_visible' | 'no_violation_visible' | 'duplicate' | 'edited_image' | 'wrong_location' | 'insufficient_evidence' | 'other'
    }
  }
}

// Convenience aliases
export type Profile    = Database['public']['Tables']['profiles']['Row']
export type Report     = Database['public']['Tables']['reports']['Row']
export type AuditLog   = Database['public']['Tables']['report_audit_log']['Row']
export type Dispute    = Database['public']['Tables']['disputes']['Row']
export type Zone       = Database['public']['Tables']['no_parking_zones']['Row']
export type LeaderboardEntry = Database['public']['Views']['leaderboard']['Row']

export type UserRole          = Database['public']['Enums']['user_role']
export type ViolationCategory = Database['public']['Enums']['violation_category']
export type ReportStatus      = Database['public']['Enums']['report_status']
export type RejectionReason   = Database['public']['Enums']['rejection_reason']
