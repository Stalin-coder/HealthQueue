-- Allow patients to update their own queue token status (for check-in)
CREATE POLICY "Patients can update own queue tokens"
ON public.queue_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);