
-- Create dev role (system role with all permissions)
INSERT INTO public.roles (name, description, is_system)
VALUES ('dev', 'Desenvolvedor do sistema com acesso total', true)
ON CONFLICT DO NOTHING;

-- Add unique constraint on role_permissions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_page_path_key'
  ) THEN
    ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_id_page_path_key UNIQUE (role_id, page_path);
  END IF;
END $$;

-- Add all page permissions for dev role
INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit)
SELECT r.id, p.path, true, true
FROM public.roles r
CROSS JOIN (VALUES 
  ('/'), ('/printers'), ('/alerts'), ('/network-map'), ('/maintenance'),
  ('/history'), ('/sectors'), ('/reports'), ('/data-sources'), ('/settings'),
  ('/users'), ('/audit'), ('/web-mapper')
) AS p(path)
WHERE r.name = 'dev'
ON CONFLICT (role_id, page_path) DO UPDATE SET can_view = true, can_edit = true;

-- Update create_profile_with_role to auto-assign dev role to first user
CREATE OR REPLACE FUNCTION public.create_profile_with_role(_user_id uuid, _full_name text, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_first boolean;
  _role_name text;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO _is_first;
  
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email) VALUES (_user_id, _full_name, _email);
  
  -- Assign dev role if first user, otherwise viewer
  IF _is_first THEN
    _role_name := 'dev';
  ELSE
    _role_name := 'viewer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT _user_id, id FROM public.roles WHERE name = _role_name;
END;
$$;
