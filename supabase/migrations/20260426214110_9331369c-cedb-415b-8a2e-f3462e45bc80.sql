CREATE TABLE public.signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID,
  kit_code TEXT,
  child_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_contact TEXT,
  grade TEXT,
  notes TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a signup"
ON public.signups FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view signups"
ON public.signups FOR SELECT
USING (true);

CREATE POLICY "Staff update own signups"
ON public.signups FOR UPDATE
USING (auth.uid() = staff_user_id);

CREATE POLICY "Staff delete own signups"
ON public.signups FOR DELETE
USING (auth.uid() = staff_user_id);

CREATE INDEX idx_signups_staff_user_id ON public.signups(staff_user_id);
CREATE INDEX idx_signups_kit_code ON public.signups(kit_code);

CREATE TRIGGER set_signups_updated_at
BEFORE UPDATE ON public.signups
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();