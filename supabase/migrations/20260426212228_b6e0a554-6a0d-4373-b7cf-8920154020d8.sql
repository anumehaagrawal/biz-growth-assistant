CREATE TABLE public.follow_up_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  guardian_contact TEXT NOT NULL,
  activity_attended TEXT NOT NULL,
  date_attended DATE NOT NULL,
  interest_area TEXT,
  follow_up_status TEXT NOT NULL DEFAULT 'Needs 48-hour follow-up',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own follow-up contacts" ON public.follow_up_contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own follow-up contacts" ON public.follow_up_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own follow-up contacts" ON public.follow_up_contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own follow-up contacts" ON public.follow_up_contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER follow_up_contacts_updated_at BEFORE UPDATE ON public.follow_up_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();