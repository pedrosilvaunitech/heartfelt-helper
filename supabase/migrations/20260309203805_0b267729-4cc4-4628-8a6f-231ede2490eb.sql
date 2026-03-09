
-- Update has_page_permission to also grant full access to dev role
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page_path text, _permission text DEFAULT 'view'::text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    public.has_role_name(_user_id, 'admin')
    OR public.has_role_name(_user_id, 'dev')
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
