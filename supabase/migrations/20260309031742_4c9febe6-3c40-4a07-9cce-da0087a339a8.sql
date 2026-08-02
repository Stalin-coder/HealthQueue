-- Doctor schedules: per-day availability with optional break times
CREATE TABLE public.doctor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  break_start time DEFAULT NULL,
  break_end time DEFAULT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Anyone can view schedules (patients need to see availability)
CREATE POLICY "Anyone can view doctor schedules"
  ON public.doctor_schedules FOR SELECT
  USING (true);

-- Clinic admins can manage schedules for their doctors
CREATE POLICY "Clinic admins can insert schedules"
  ON public.doctor_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id
      AND d.clinic_id = get_clinic_id_for_admin(auth.uid())
    )
  );

CREATE POLICY "Clinic admins can update schedules"
  ON public.doctor_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id
      AND d.clinic_id = get_clinic_id_for_admin(auth.uid())
    )
  );

CREATE POLICY "Clinic admins can delete schedules"
  ON public.doctor_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id
      AND d.clinic_id = get_clinic_id_for_admin(auth.uid())
    )
  );

-- Update trigger
CREATE TRIGGER update_doctor_schedules_updated_at
  BEFORE UPDATE ON public.doctor_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
