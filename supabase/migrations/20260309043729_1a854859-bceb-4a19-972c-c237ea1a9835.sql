
-- Allow authenticated users to register clinics
CREATE POLICY "Authenticated users can register clinics"
ON public.clinics FOR INSERT TO authenticated
WITH CHECK (true);

-- Drop existing select policy and replace with status-filtered one
DROP POLICY IF EXISTS "Anyone can view clinics" ON public.clinics;

CREATE POLICY "Anyone can view approved clinics"
ON public.clinics FOR SELECT
USING (
  status = 'approved'
  OR auth.uid() = admin_user_id
  OR public.has_role(auth.uid(), 'platform_admin')
);

-- Create a function for platform admins to update clinic status
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_admin'
  )
$$;

-- Allow platform admins to update any clinic (for approval)
CREATE POLICY "Platform admins can update any clinic"
ON public.clinics FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()));
