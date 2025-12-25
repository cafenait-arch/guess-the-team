import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}

// XP required for each level (cumulative)
export const getXpForLevel = (level: number): number => {
  return level * level * 100; // Level 1: 100, Level 2: 400, Level 3: 900, etc.
};

export const getLevelFromXp = (xp: number): number => {
  let level = 1;
  while (getXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
};

export const getXpProgress = (xp: number): { current: number; required: number; percentage: number } => {
  const level = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const progressXp = xp - currentLevelXp;
  const requiredXp = nextLevelXp - currentLevelXp;
  
  return {
    current: progressXp,
    required: requiredXp,
    percentage: (progressXp / requiredXp) * 100,
  };
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && !error) {
      setProfile(data as UserProfile);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'username' | 'avatar_url'>>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      await fetchProfile(user.id);
    }
    return { error };
  };

  const addXp = async (amount: number) => {
    if (!user || !profile) return { error: new Error('Not authenticated'), leveledUp: false };

    const newXp = profile.xp + amount;
    const oldLevel = profile.level;
    const newLevel = getLevelFromXp(newXp);

    const { error } = await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('user_id', user.id);

    if (!error) {
      await fetchProfile(user.id);
    }

    return { error, leveledUp: newLevel > oldLevel };
  };

  const refreshProfile = useCallback(() => {
    if (user) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    updateProfile,
    addXp,
    refreshProfile,
  };
};
