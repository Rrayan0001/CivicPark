ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS staff_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_verified_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS staff_verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS staff_suspended BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET
  staff_verified = TRUE,
  staff_verified_at = COALESCE(staff_verified_at, NOW())
WHERE role IN ('officer', 'admin');
