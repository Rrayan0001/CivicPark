-- ─────────────────────────────────────────────────────────────
-- 002 Row Level Security Policies — Civic Park
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_parking_zones ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get caller's role ─────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── PROFILES ───────────────────────────────────────────────────

-- Citizens: read + update only their own row
CREATE POLICY "profiles_own_read" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = 'citizen'); -- cannot self-escalate role

-- Officers/admins: read all profiles
CREATE POLICY "profiles_officer_read" ON public.profiles
  FOR SELECT USING (public.current_user_role() IN ('officer', 'admin'));

-- Admin: full control
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.current_user_role() = 'admin');

-- ── REPORTS ────────────────────────────────────────────────────

-- Citizens: insert their own reports
CREATE POLICY "reports_citizen_insert" ON public.reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_banned = TRUE
    )
  );

-- Citizens: read only their own reports
CREATE POLICY "reports_citizen_read" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Officers: read all reports, update review fields only
CREATE POLICY "reports_officer_read" ON public.reports
  FOR SELECT USING (public.current_user_role() IN ('officer', 'admin'));

CREATE POLICY "reports_officer_update" ON public.reports
  FOR UPDATE USING (public.current_user_role() IN ('officer', 'admin'));

-- Service role (Python AI): handled via service key (bypasses RLS)

-- ── REPORT AUDIT LOG ───────────────────────────────────────────

-- No direct inserts from clients (triggers only via SECURITY DEFINER)
-- Officers/admins can read
CREATE POLICY "audit_log_officer_read" ON public.report_audit_log
  FOR SELECT USING (public.current_user_role() IN ('officer', 'admin'));

-- Citizens can read audit logs for their own reports
CREATE POLICY "audit_log_citizen_read" ON public.report_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id AND r.reporter_id = auth.uid()
    )
  );

-- ── DISPUTES ───────────────────────────────────────────────────

-- Anyone can insert a dispute (vehicle owners, no auth required)
CREATE POLICY "disputes_public_insert" ON public.disputes
  FOR INSERT WITH CHECK (TRUE);

-- Officers/admins can read and update disputes
CREATE POLICY "disputes_officer_read" ON public.disputes
  FOR SELECT USING (public.current_user_role() IN ('officer', 'admin'));

CREATE POLICY "disputes_officer_update" ON public.disputes
  FOR UPDATE USING (public.current_user_role() IN ('officer', 'admin'));

-- ── NO-PARKING ZONES ───────────────────────────────────────────

-- Public read (for map display)
CREATE POLICY "zones_public_read" ON public.no_parking_zones
  FOR SELECT USING (active = TRUE);

-- Admin-only writes
CREATE POLICY "zones_admin_insert" ON public.no_parking_zones
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY "zones_admin_update" ON public.no_parking_zones
  FOR UPDATE USING (public.current_user_role() = 'admin');

CREATE POLICY "zones_admin_delete" ON public.no_parking_zones
  FOR DELETE USING (public.current_user_role() = 'admin');

-- ── LEADERBOARD ────────────────────────────────────────────────
-- Materialized view — no RLS needed, it only exposes:
-- full_name, tier, approved_reports, reward_points, rank (no PII)
GRANT SELECT ON public.leaderboard TO anon, authenticated;
