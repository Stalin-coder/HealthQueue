
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('patient', 'clinic_admin', 'platform_admin');

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('booked', 'cancelled', 'completed');

-- Create enum for queue token status
CREATE TYPE public.queue_status AS ENUM ('waiting', 'serving', 'completed', 'skipped', 'checked_in', 'in_consultation');

-- Create clinic_status enum
CREATE TYPE public.clinic_status AS ENUM ('pending', 'approved', 'rejected');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create clinics table
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT,
  description TEXT,
  admin_user_id UUID REFERENCES auth.users(id),
  status public.clinic_status NOT NULL DEFAULT 'pending',
  is_open BOOLEAN NOT NULL DEFAULT true,
  latitude DOUBLE PRECISION DEFAULT NULL,
  longitude DOUBLE PRECISION DEFAULT NULL,
  city TEXT DEFAULT NULL,
  rating NUMERIC(2,1) DEFAULT 4.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  degree TEXT NOT NULL DEFAULT '',
  specialization TEXT NOT NULL DEFAULT 'General',
  consultation_start TIME NOT NULL DEFAULT '09:00',
  consultation_end TIME NOT NULL DEFAULT '17:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create doctor_schedules table
CREATE TABLE public.doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  break_start TIME DEFAULT NULL,
  break_end TIME DEFAULT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'booked',
  reason_for_visit TEXT,
  booked_for_name TEXT DEFAULT NULL,
  booked_for_phone TEXT DEFAULT NULL,
  booked_for_age INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create queue_tokens table
CREATE TABLE public.queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_number INTEGER NOT NULL,
  queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status queue_status NOT NULL DEFAULT 'waiting',
  called_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, queue_date, token_number)
);
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;

-- Create visit_history table
CREATE TABLE public.visit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  patient_phone TEXT,
  patient_name TEXT,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  visit_date DATE NOT NULL,
  reason_for_visit TEXT,
  diagnosis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_history ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get clinic_id for admin user
CREATE OR REPLACE FUNCTION public.get_clinic_id_for_admin(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.clinics WHERE admin_user_id = _user_id LIMIT 1
$$;

-- Function to check platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'platform_admin'
  )
$$;

-- Auto-create profile and assign patient role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_doctor_schedules_updated_at BEFORE UPDATE ON public.doctor_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next token number
CREATE OR REPLACE FUNCTION public.get_next_token_number(_doctor_id UUID, _date DATE)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(MAX(token_number), 0) + 1
  FROM public.queue_tokens
  WHERE doctor_id = _doctor_id AND queue_date = _date
$$;

-- Auto-create visit history when appointment is completed
CREATE OR REPLACE FUNCTION public.create_visit_history()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.visit_history (patient_id, doctor_id, clinic_id, appointment_id, visit_date, reason_for_visit, patient_name, patient_phone)
    VALUES (
      NEW.patient_id, NEW.doctor_id, NEW.clinic_id, NEW.id, NEW.appointment_date, NEW.reason_for_visit,
      COALESCE(NEW.booked_for_name, (SELECT full_name FROM public.profiles WHERE user_id = NEW.patient_id LIMIT 1)),
      COALESCE(NEW.booked_for_phone, (SELECT phone FROM public.profiles WHERE user_id = NEW.patient_id LIMIT 1))
    ) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_completed
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.create_visit_history();

-- RLS Policies

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- clinics
CREATE POLICY "Anyone can view approved clinics" ON public.clinics FOR SELECT USING (
  status = 'approved' OR auth.uid() = admin_user_id OR public.is_platform_admin(auth.uid())
);
CREATE POLICY "Authenticated users can register clinics" ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_user_id AND status = 'pending');
CREATE POLICY "Clinic admins can update own clinic" ON public.clinics FOR UPDATE USING (auth.uid() = admin_user_id);
CREATE POLICY "Platform admins can update any clinic" ON public.clinics FOR UPDATE TO authenticated USING (public.is_platform_admin(auth.uid()));

-- doctors
CREATE POLICY "Anyone can view doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Clinic admins can insert doctors" ON public.doctors FOR INSERT WITH CHECK (clinic_id = public.get_clinic_id_for_admin(auth.uid()));
CREATE POLICY "Clinic admins can update doctors" ON public.doctors FOR UPDATE USING (clinic_id = public.get_clinic_id_for_admin(auth.uid()));
CREATE POLICY "Clinic admins can delete doctors" ON public.doctors FOR DELETE USING (clinic_id = public.get_clinic_id_for_admin(auth.uid()));

-- doctor_schedules
CREATE POLICY "Anyone can view doctor schedules" ON public.doctor_schedules FOR SELECT USING (true);
CREATE POLICY "Clinic admins can insert schedules" ON public.doctor_schedules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.clinic_id = get_clinic_id_for_admin(auth.uid()))
);
CREATE POLICY "Clinic admins can update schedules" ON public.doctor_schedules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.clinic_id = get_clinic_id_for_admin(auth.uid()))
);
CREATE POLICY "Clinic admins can delete schedules" ON public.doctor_schedules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.clinic_id = get_clinic_id_for_admin(auth.uid()))
);

-- appointments
CREATE POLICY "Patients can view own appointments" ON public.appointments FOR SELECT USING (
  auth.uid() = patient_id OR clinic_id = public.get_clinic_id_for_admin(auth.uid())
);
CREATE POLICY "Patients can create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients can cancel own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "Clinic admins can update appointments" ON public.appointments FOR UPDATE USING (
  clinic_id = public.get_clinic_id_for_admin(auth.uid())
);

-- queue_tokens
CREATE POLICY "Anyone can view queue tokens" ON public.queue_tokens FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert queue tokens" ON public.queue_tokens FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Clinic admins can update queue tokens" ON public.queue_tokens FOR UPDATE USING (
  clinic_id = public.get_clinic_id_for_admin(auth.uid())
);

-- visit_history
CREATE POLICY "Clinic admins can view visit history" ON public.visit_history FOR SELECT USING (
  clinic_id = get_clinic_id_for_admin(auth.uid()) OR auth.uid() = patient_id
);
CREATE POLICY "Clinic admins can insert visit history" ON public.visit_history FOR INSERT WITH CHECK (clinic_id = get_clinic_id_for_admin(auth.uid()));
CREATE POLICY "Clinic admins can update visit history" ON public.visit_history FOR UPDATE USING (clinic_id = get_clinic_id_for_admin(auth.uid()));

-- Enable realtime for queue_tokens
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_tokens;
