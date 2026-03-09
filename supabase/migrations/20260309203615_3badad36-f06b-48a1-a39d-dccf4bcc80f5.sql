
-- Add web-mapper permissions for existing roles
DO $$
DECLARE
  admin_id uuid;
  tech_id uuid;
BEGIN
  SELECT id INTO admin_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO tech_id FROM public.roles WHERE name = 'technician';
  
  INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit) 
  VALUES (admin_id, '/web-mapper', true, true)
  ON CONFLICT (role_id, page_path) DO NOTHING;
  
  INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit) 
  VALUES (tech_id, '/web-mapper', true, true)
  ON CONFLICT (role_id, page_path) DO NOTHING;
END $$;
