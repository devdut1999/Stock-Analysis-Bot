'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '../supabase/client';
import { useRouter } from 'next/navigation';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Memoize Supabase client to avoid recreating on every render
  const supabase = useMemo<SupabaseClient>(() => createClient(), []);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if signOut fails
      router.push('/');
      router.refresh();
    }
  }, [supabase, router]);

  return { user, loading, signOut };
}
