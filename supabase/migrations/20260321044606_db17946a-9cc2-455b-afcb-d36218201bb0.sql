
-- Trigger: when a clinic is approved, auto-set the owner's role to clinic_admin
CREATE OR REPLACE FUNCTION public.on_clinic_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update the clinic owner's role to clinic_admin
    UPDATE public.user_roles
    SET role = 'clinic_admin'
    WHERE user_id = NEW.admin_user_id AND role != 'clinic_admin';
  END IF;
  
  -- If status changes away from 'approved' (e.g. rejected), revert to patient
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Only revert if user has no other approved clinics
    IF NOT EXISTS (
      SELECT 1 FROM public.clinics 
      WHERE admin_user_id = NEW.admin_user_id 
        AND id != NEW.id 
        AND status = 'approved'
    ) THEN
      UPDATE public.user_roles
      SET role = 'patient'
      WHERE user_id = NEW.admin_user_id AND role = 'clinic_admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_on_clinic_approved
BEFORE UPDATE ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.on_clinic_approved();
