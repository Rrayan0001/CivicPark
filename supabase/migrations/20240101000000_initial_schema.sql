-- ─────────────────────────────────────────────────────────────
-- 001 Initial Schema — Civic Park
-- ─────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── ENUMS ──────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('citizen', 'officer', 'admin');

CREATE TYPE violation_category AS ENUM (
  'no_parking',
  'wrong_parking',
  'footpath_parking',
  'blocking_traffic',
  'double_parking'
);

CREATE TYPE report_status AS ENUM (
  'pending_ai',
  'pending_review',
  'approved',
  'rejected',
  'challan_issued',
  'auto_rejected_duplicate',
  'auto_rejected_low_quality',
  'disputed'
);

CREATE TYPE rejection_reason AS ENUM (
  'plate_not_visible',
  'no_violation_visible',
  'duplicate',
  'edited_image',
  'wrong_location',
  'insufficient_evidence',
  'other'
);

-- ── PROFILES ───────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role               user_role NOT NULL DEFAULT 'citizen',
  full_name          TEXT,
  phone              TEXT,
  aadhaar_verified   BOOLEAN DEFAULT FALSE,
  total_reports      INT DEFAULT 0,
  approved_reports   INT DEFAULT 0,
  reward_points      INT DEFAULT 0,
  tier               TEXT DEFAULT 'bronze',
  is_banned          BOOLEAN DEFAULT FALSE,
  ban_reason         TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── REPORTS ────────────────────────────────────────────────────

CREATE TABLE public.reports (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id               UUID NOT NULL REFERENCES public.profiles(id),
  category                  violation_category NOT NULL,
  description               TEXT,
  location                  GEOGRAPHY(POINT, 4326) NOT NULL,
  address                   TEXT,
  ward                      TEXT,
  status                    report_status NOT NULL DEFAULT 'pending_ai',

  -- evidence
  photo_urls                TEXT[] NOT NULL,
  video_url                 TEXT,
  captured_at               TIMESTAMPTZ NOT NULL,
  device_metadata           JSONB,

  -- AI results
  ai_processed_at           TIMESTAMPTZ,
  detected_plate            TEXT,
  plate_confidence          NUMERIC(4,3),
  perceptual_hashes         TEXT[],
  duplicate_of              UUID REFERENCES public.reports(id),
  ai_flags                  JSONB,

  -- review
  reviewer_id               UUID REFERENCES public.profiles(id),
  reviewed_at               TIMESTAMPTZ,
  rejection_reason          rejection_reason,
  reviewer_notes            TEXT,

  -- challan
  challan_id                TEXT,
  challan_issued_at         TIMESTAMPTZ,
  fine_amount               INT,
  fine_paid                 BOOLEAN DEFAULT FALSE,

  -- audit / legal
  section_65b_certificate_url TEXT,
  evidence_hash             TEXT NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status      ON public.reports(status);
CREATE INDEX idx_reports_reporter    ON public.reports(reporter_id);
CREATE INDEX idx_reports_location    ON public.reports USING GIST(location);
CREATE INDEX idx_reports_plate       ON public.reports(detected_plate) WHERE detected_plate IS NOT NULL;
CREATE INDEX idx_reports_captured_at ON public.reports(captured_at);

-- ── AUDIT LOG ──────────────────────────────────────────────────

CREATE TABLE public.report_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id),
  action      TEXT NOT NULL,
  from_status report_status,
  to_status   report_status,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_report ON public.report_audit_log(report_id);

-- ── DISPUTES ───────────────────────────────────────────────────

CREATE TABLE public.disputes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id        UUID NOT NULL REFERENCES public.reports(id),
  contact_email    TEXT NOT NULL,
  contact_phone    TEXT,
  reason           TEXT NOT NULL,
  resolved         BOOLEAN DEFAULT FALSE,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── NO-PARKING ZONES ───────────────────────────────────────────

CREATE TABLE public.no_parking_zones (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT,
  area       GEOGRAPHY(POLYGON, 4326) NOT NULL,
  source     TEXT DEFAULT 'manual',
  confidence NUMERIC(4,3) DEFAULT 1.0,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zones_area ON public.no_parking_zones USING GIST(area);

-- ── LEADERBOARD (Materialized View) ────────────────────────────

CREATE MATERIALIZED VIEW public.leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.tier,
  p.approved_reports,
  p.reward_points,
  RANK() OVER (ORDER BY p.reward_points DESC) AS rank
FROM public.profiles p
WHERE p.role = 'citizen' AND NOT p.is_banned
ORDER BY p.reward_points DESC
LIMIT 1000;

CREATE UNIQUE INDEX idx_leaderboard_id ON public.leaderboard(id);

-- ── TRIGGERS ───────────────────────────────────────────────────

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-insert audit log on report status change
CREATE OR REPLACE FUNCTION public.log_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.report_audit_log (
      report_id, actor_id, action, from_status, to_status, metadata
    ) VALUES (
      NEW.id,
      NEW.reviewer_id,
      CASE
        WHEN NEW.status = 'pending_review'             THEN 'ai_processed'
        WHEN NEW.status = 'approved'                   THEN 'approved'
        WHEN NEW.status = 'rejected'                   THEN 'rejected'
        WHEN NEW.status = 'challan_issued'             THEN 'challan_issued'
        WHEN NEW.status = 'auto_rejected_duplicate'    THEN 'auto_rejected_duplicate'
        WHEN NEW.status = 'auto_rejected_low_quality'  THEN 'auto_rejected_low_quality'
        WHEN NEW.status = 'disputed'                   THEN 'disputed'
        ELSE 'status_changed'
      END,
      OLD.status,
      NEW.status,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER report_status_audit
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.log_report_status_change();

-- Insert audit log on report creation
CREATE OR REPLACE FUNCTION public.log_report_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.report_audit_log (
    report_id, actor_id, action, from_status, to_status, metadata
  ) VALUES (
    NEW.id,
    NEW.reporter_id,
    'created',
    NULL,
    NEW.status,
    jsonb_build_object('category', NEW.category)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER report_created_audit
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.log_report_created();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Strike system: auto-ban citizens with 3+ fraud rejections in 30 days
CREATE OR REPLACE FUNCTION public.check_strike_ban()
RETURNS TRIGGER AS $$
DECLARE
  fraud_count INT;
BEGIN
  IF NEW.status = 'rejected' AND NEW.rejection_reason IN ('edited_image', 'no_violation_visible') THEN
    SELECT COUNT(*) INTO fraud_count
    FROM public.reports
    WHERE reporter_id = NEW.reporter_id
      AND status = 'rejected'
      AND rejection_reason IN ('edited_image', 'no_violation_visible')
      AND reviewed_at > NOW() - INTERVAL '30 days';

    IF fraud_count >= 3 THEN
      UPDATE public.profiles
      SET is_banned = TRUE,
          ban_reason = 'Auto-banned: 3+ fraud report rejections in 30 days'
      WHERE id = NEW.reporter_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER report_strike_check
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.check_strike_ban();

-- ── HELPER RPC: hotspots ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_hotspots(
  days_back INT DEFAULT 30
)
RETURNS TABLE (
  lat FLOAT,
  lng FLOAT,
  count BIGINT
)
LANGUAGE sql STABLE AS $$
  SELECT
    ST_Y(location::geometry) AS lat,
    ST_X(location::geometry) AS lng,
    COUNT(*) AS count
  FROM public.reports
  WHERE
    created_at > NOW() - (days_back || ' days')::INTERVAL
    AND status IN ('approved', 'challan_issued')
  GROUP BY lat, lng;
$$;

-- ── HELPER RPC: duplicate detection ────────────────────────────

CREATE OR REPLACE FUNCTION public.find_potential_duplicates(
  p_plate      TEXT,
  p_lat        FLOAT,
  p_lng        FLOAT,
  p_captured   TIMESTAMPTZ,
  p_report_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  id           UUID,
  detected_plate TEXT,
  distance_m   FLOAT,
  time_diff_s  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    r.id,
    r.detected_plate,
    ST_Distance(
      r.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m,
    ABS(EXTRACT(EPOCH FROM (r.captured_at - p_captured))) AS time_diff_s
  FROM public.reports r
  WHERE
    (r.detected_plate = p_plate OR p_plate IS NULL)
    AND ST_DWithin(
      r.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      50  -- 50 metres
    )
    AND ABS(EXTRACT(EPOCH FROM (r.captured_at - p_captured))) < 1800  -- 30 min
    AND (p_report_id IS NULL OR r.id != p_report_id)
    AND r.status NOT IN ('auto_rejected_duplicate', 'auto_rejected_low_quality', 'rejected')
  ORDER BY distance_m ASC;
$$;
