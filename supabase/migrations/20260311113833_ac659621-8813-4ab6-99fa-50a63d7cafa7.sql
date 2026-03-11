
-- Fix: Recreate ALL policies as PERMISSIVE (default) instead of RESTRICTIVE

-- ========== PROFILES ==========
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- ========== ROLES ==========
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.roles;

CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can update roles" ON public.roles FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete roles" ON public.roles FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- ========== USER_ROLES ==========
DROP POLICY IF EXISTS "Authenticated can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;

CREATE POLICY "Authenticated can view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can update user_roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete user_roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- ========== ROLE_PERMISSIONS ==========
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions" ON public.role_permissions;

CREATE POLICY "Authenticated can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can update permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Admins can delete permissions" ON public.role_permissions FOR DELETE TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));

-- ========== AUDIT_LOGS ==========
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins and devs can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert own audit logs" ON public.audit_logs;

CREATE POLICY "Admins and devs can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role_name(auth.uid(), 'admin') OR has_role_name(auth.uid(), 'dev'));
CREATE POLICY "Authenticated can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
