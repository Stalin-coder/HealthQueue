CREATE OR REPLACE FUNCTION public.get_clinic_id_for_admin(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.clinics 
  WHERE admin_user_id = _user_id 
    AND status = 'approved'
  ORDER BY created_at DESC
  LIMIT 1
$$;