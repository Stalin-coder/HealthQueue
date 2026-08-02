-- Add is_open column to clinics table
ALTER TABLE public.clinics 
ADD COLUMN is_open boolean NOT NULL DEFAULT true;