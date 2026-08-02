-- Add location and rating columns to clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS city text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 4.0;

-- Add booking-for-others columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booked_for_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS booked_for_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS booked_for_age integer DEFAULT NULL;
