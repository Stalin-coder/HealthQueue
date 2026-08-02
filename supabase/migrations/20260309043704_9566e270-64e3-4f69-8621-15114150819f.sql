
-- Add clinic_status enum
CREATE TYPE public.clinic_status AS ENUM ('pending', 'approved', 'rejected');

-- Add status column to clinics (existing clinics default to 'approved')
ALTER TABLE public.clinics ADD COLUMN status public.clinic_status NOT NULL DEFAULT 'approved';

-- Add platform_admin to app_role enum
ALTER TYPE public.app_role ADD VALUE 'platform_admin';
