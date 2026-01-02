'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  username: string;
  email: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const supabase = getSupabaseClient();

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player',
          });
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player',
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        // Also create/update in users table for game data
        await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            username,
          }, { onConflict: 'id' });

        setUser({
          id: data.user.id,
          email: data.user.email || '',
          username,
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'Player',
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const updateUsername = useCallback(async (newUsername: string) => {
    if (!user) return;

    try {
      const supabase = getSupabaseClient();

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { username: newUsername },
      });

      // Update users table
      await supabase
        .from('users')
        .update({ username: newUsername })
        .eq('id', user.id);

      setUser({ ...user, username: newUsername });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update username';
      setError(message);
      throw err;
    }
  }, [user]);

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    error,
    register,
    login,
    logout,
    updateUsername,
  };
}
