ALTER TABLE public.follow_up_contacts
  ALTER COLUMN user_id DROP NOT NULL;

CREATE POLICY "Families can submit public visit requests" ON public.follow_up_contacts
  FOR INSERT WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated staff view unassigned visit requests" ON public.follow_up_contacts
  FOR SELECT USING (auth.role() = 'authenticated' AND user_id IS NULL);

CREATE POLICY "Authenticated staff update unassigned visit requests" ON public.follow_up_contacts
  FOR UPDATE USING (auth.role() = 'authenticated' AND user_id IS NULL);

CREATE POLICY "Authenticated staff delete unassigned visit requests" ON public.follow_up_contacts
  FOR DELETE USING (auth.role() = 'authenticated' AND user_id IS NULL);
