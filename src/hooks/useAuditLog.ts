import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCallback } from 'react';

export function useAuditLog() {
  const { user, profile } = useAuth();

  const logAction = useCallback(async (
    action: string,
    entityType?: string,
    entityId?: string,
    details?: string,
    oldData?: any,
    newData?: any,
  ) => {
    if (!user) return;
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: profile?.email || user.email || '',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      old_data: oldData,
      new_data: newData,
    } as any);
  }, [user, profile]);

  return { logAction };
}
