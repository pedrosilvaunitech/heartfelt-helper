
-- Create printers table for production use
CREATE TABLE IF NOT EXISTS public.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  hostname text DEFAULT '',
  brand text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  serial text DEFAULT '',
  firmware text DEFAULT '',
  mac text DEFAULT '',
  location text DEFAULT '',
  sector text DEFAULT '',
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'warning', 'maintenance', 'disabled')),
  uptime text DEFAULT '0d 0h 0m',
  page_count integer DEFAULT 0,
  pages_per_day integer DEFAULT 0,
  supplies jsonb DEFAULT '[]'::jsonb,
  last_seen timestamptz DEFAULT now(),
  discovered_at timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view printers" ON public.printers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert printers" ON public.printers FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev') OR has_role_name(auth.uid(), 'technician'));
CREATE POLICY "Admins can update printers" ON public.printers FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev') OR has_role_name(auth.uid(), 'technician'));
CREATE POLICY "Admins can delete printers" ON public.printers FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.printers;
