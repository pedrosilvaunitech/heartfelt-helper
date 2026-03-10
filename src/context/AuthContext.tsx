import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPagePermission: (pagePath: string, permission?: 'view' | 'edit') => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const isSigningOut = useRef(false);

  const clearState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const handleRLSError = useCallback((error: any) => {
    if (error?.code === '42501' || error?.message?.includes('row-level security') ||
        error?.status === 401 || error?.status === 403) {
      console.warn('RLS/Auth error detected, signing out:', error.message);
      if (!isSigningOut.current) {
        isSigningOut.current = true;
        supabase.auth.signOut().finally(() => {
          clearState();
          isSigningOut.current = false;
        });
      }
      return true;
    }
    return false;
  }, [clearState]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (handleRLSError(error)) return;
      // Profile doesn't exist - try to create it
      if (error.code === 'PGRST116') {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser) {
          const { error: createError } = await supabase.rpc('create_profile_with_role', {
            _user_id: currentUser.id,
            _full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Usuário',
            _email: currentUser.email || '',
          });
          if (createError) {
            console.error('Error creating profile:', createError);
            return;
          }
          // Refetch after creation
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (newProfile) setProfile(newProfile as Profile);
        }
        return;
      }
      console.error('Error fetching profile:', error);
      return;
    }
    if (data) setProfile(data as Profile);
  }, [handleRLSError]);

  const fetchRoles = useCallback(async (userId: string) => {
    const { data, error } = await supabase.rpc('get_user_roles', { _user_id: userId });
    if (error) {
      if (handleRLSError(error)) return;
      console.error('Error fetching roles:', error);
      return;
    }
    if (data) setRoles(data as string[]);
  }, [handleRLSError]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  }, [user, fetchProfile, fetchRoles]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (!error && data.user) {
      await supabase.rpc('create_profile_with_role', {
        _user_id: data.user.id,
        _full_name: fullName,
        _email: email,
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    isSigningOut.current = true;
    await supabase.auth.signOut();
    clearState();
    isSigningOut.current = false;
  };

  const hasRole = (role: string) => roles.includes(role);

  const hasPagePermission = async (pagePath: string, permission: 'view' | 'edit' = 'view') => {
    if (!user) return false;
    // Dev and admin bypass
    if (roles.includes('dev') || roles.includes('admin')) return true;
    const { data, error } = await supabase.rpc('has_page_permission', {
      _user_id: user.id,
      _page_path: pagePath,
      _permission: permission,
    });
    if (error) {
      handleRLSError(error);
      return false;
    }
    return !!data;
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, roles, loading,
      signIn, signUp, signOut, hasRole, hasPagePermission, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
