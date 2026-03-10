import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function PermissionGate({ 
  pagePath, 
  permission = 'view',
  children, 
  fallback 
}: { 
  pagePath: string;
  permission?: 'view' | 'edit';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, hasRole, hasPagePermission } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }
    // Dev and admin bypass all permission checks
    if (hasRole('dev') || hasRole('admin')) {
      setAllowed(true);
      return;
    }
    hasPagePermission(pagePath, permission).then(setAllowed);
  }, [user, pagePath, permission, hasRole, hasPagePermission]);

  if (allowed === null) return null;
  if (!allowed) return fallback ? <>{fallback}</> : (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    </div>
  );

  return <>{children}</>;
}
