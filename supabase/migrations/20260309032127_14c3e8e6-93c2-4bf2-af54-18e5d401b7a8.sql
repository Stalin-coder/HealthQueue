
-- Add reason_for_visit to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reason_for_visit text;

-- Create patient visit history view (materialized from appointments)
CREATE TABLE IF NOT EXISTS public.visit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_phone text,
  patient_name text,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  visit_date date NOT NULL,
  reason_for_visit text,
  diagnosis text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visit_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view visit history (doctors/admins need it)
CREATE POLICY "Clinic admins can view visit history" ON public.visit_history
FOR SELECT USING (
  clinic_id = get_clinic_id_for_admin(auth.uid()) OR auth.uid() = patient_id
);

-- Clinic admins can insert/update visit history
CREATE POLICY "Clinic admins can insert visit history" ON public.visit_history
FOR INSERT WITH CHECK (clinic_id = get_clinic_id_for_admin(auth.uid()));

CREATE POLICY "Clinic admins can update visit history" ON public.visit_history
FOR UPDATE USING (clinic_id = get_clinic_id_for_admin(auth.uid()));

-- Auto-create visit history when appointment is completed
CREATE OR REPLACE FUNCTION public.create_visit_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.visit_history (patient_id, doctor_id, clinic_id, appointment_id, visit_date, reason_for_visit, patient_name, patient_phone)
    VALUES (
      NEW.patient_id,
      NEW.doctor_id,
      NEW.clinic_id,
      NEW.id,
      NEW.appointment_date,
      NEW.reason_for_visit,
      COALESCE(NEW.booked_for_name, (SELECT full_name FROM public.profiles WHERE user_id = NEW.patient_id LIMIT 1)),
      COALESCE(NEW.booked_for_phone, (SELECT phone FROM public.profiles WHERE user_id = NEW.patient_id LIMIT 1))
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_completed
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_visit_history();
