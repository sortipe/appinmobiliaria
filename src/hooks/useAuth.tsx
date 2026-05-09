import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  hasPermission: (module: string, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedDemo = localStorage.getItem('demo_user');
    if (savedDemo) {
      const data = JSON.parse(savedDemo);
      setUser(data.user);
      setProfile(data.profile);
      setLoading(false);
      return;
    }

    const savedProfile = localStorage.getItem('auth_profile');
    if (savedProfile && !savedDemo) {
      setProfile(JSON.parse(savedProfile));
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
        if (!savedDemo) {
          setProfile(null);
          localStorage.removeItem('auth_profile');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('demo_user')) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        localStorage.removeItem('auth_profile');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, company:companies(*)')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      localStorage.setItem('auth_profile', JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (role: UserRole) => {
    const demoData = {
      user: { id: 'demo-id', email: `demo-${role}@example.com` } as any,
      profile: {
        id: 'demo-id',
        full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`,
        email: `demo-${role}@example.com`,
        role: role,
        company_id: 'demo-company',
        company: { id: 'demo-company', name: 'Empresa Inmobiliaria S.A.' }
      } as Profile
    };
    
    setUser(demoData.user);
    setProfile(demoData.profile);
    localStorage.setItem('demo_user', JSON.stringify(demoData));
  };

  const hasPermission = (_module: string, action: string) => {
    if (!profile) return false;
    if (profile.role === 'super_admin' || profile.role === 'gerente') return true;
    
    // In a real app, we'd fetch permissions from a table.
    // For now, we'll assume default permissions for Broker/Asesor
    if (profile.role === 'broker') return true; // Brokers have high access
    if (profile.role === 'asesor' && action === 'view') return true;
    
    return false;
  };

  const signOut = async () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('auth_profile');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, loginAsDemo, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
