import { useAuth } from '@/context/AuthContext';

export function useRole() {
  const { roles, hasRole } = useAuth();

  const isDev = hasRole('dev');
  const isAdmin = hasRole('admin') || isDev;
  const isTechnician = hasRole('technician');
  const isViewer = hasRole('viewer');

  const canAccess = (requiredRole?: string) => {
    if (isDev) return true; // dev bypasses all checks
    if (!requiredRole) return true;
    return hasRole(requiredRole);
  };

  return { roles, isDev, isAdmin, isTechnician, isViewer, hasRole, canAccess };
}
