
-- Tighten the insert policy: user must set themselves as admin
DROP POLICY IF EXISTS "Authenticated users can register clinics" ON public.clinics;
CREATE POLICY "Authenticated users can register clinics"
ON public.clinics FOR INSERT TO authenticated
WITH CHECK (auth.uid() = admin_user_id AND status = 'pending');
