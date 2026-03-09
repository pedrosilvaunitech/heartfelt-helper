
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text,
  department text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create roles table (custom roles)
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  UNIQUE(role_id, page_path)
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check role by name
CREATE OR REPLACE FUNCTION public.has_role_name(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name = _role_name
  )
$$;

-- Function to get user role names
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(r.name), ARRAY[]::text[])
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = _user_id
$$;

-- Function to check page permission
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page_path text, _permission text DEFAULT 'view')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.has_role_name(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = _user_id
        AND rp.page_path = _page_path
        AND (
          (_permission = 'view' AND rp.can_view = true)
          OR (_permission = 'edit' AND rp.can_edit = true)
        )
    )
$$;

-- Profiles RLS
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));

-- Roles RLS
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.roles FOR UPDATE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.roles FOR DELETE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));

-- Role permissions RLS
CREATE POLICY "Authenticated can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can update permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));

-- User roles RLS
CREATE POLICY "Authenticated can view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can update user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete user_roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));

-- Audit logs RLS
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role_name(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Audit log function
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, new_data)
    VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()), TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, old_data, new_data)
    VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()), TG_OP, TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, old_data)
    VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()), TG_OP, TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to key tables
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_role_permissions AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- Seed default roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('admin', 'Administrador com acesso total ao sistema', true),
  ('technician', 'Técnico com acesso operacional', true),
  ('viewer', 'Visualizador com acesso somente leitura', true);

-- Seed default permissions
DO $$
DECLARE
  admin_id uuid;
  tech_id uuid;
  viewer_id uuid;
  pages text[] := ARRAY['/', '/printers', '/alerts', '/network-map', '/maintenance', '/history', '/sectors', '/reports', '/data-sources', '/settings', '/users', '/audit'];
  p text;
BEGIN
  SELECT id INTO admin_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO tech_id FROM public.roles WHERE name = 'technician';
  SELECT id INTO viewer_id FROM public.roles WHERE name = 'viewer';
  
  FOREACH p IN ARRAY pages LOOP
    INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit) VALUES (admin_id, p, true, true);
    
    IF p IN ('/', '/printers', '/alerts', '/network-map', '/maintenance', '/history', '/sectors', '/reports', '/data-sources') THEN
      INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit) VALUES (tech_id, p, true, true);
    ELSIF p = '/settings' THEN
      INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit) VALUES (tech_id, p, true, false);
    END IF;
    
    IF p IN ('/', '/printers', '/alerts', '/history', '/reports') THEN
      INSERT INTO public.role_permissions (role_id, page_path, can_view, can_edit) VALUES (viewer_id, p, true, false);
    END IF;
  END LOOP;
END $$;

-- Function to create profile and assign default role (called from frontend after signup)
CREATE OR REPLACE FUNCTION public.create_profile_with_role(_user_id uuid, _full_name text, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email) VALUES (_user_id, _full_name, _email);
  INSERT INTO public.user_roles (user_id, role_id) SELECT _user_id, id FROM public.roles WHERE name = 'viewer';
END;
$$;
