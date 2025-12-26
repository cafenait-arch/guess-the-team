import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GameAccount {
  id: string;
  username: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  games_played: number;
  games_won: number;
  total_score: number;
  created_at: string;
  updated_at: string;
  game_account_id: string | null;
}

// XP required for each level (cumulative)
export const getXpForLevel = (level: number): number => {
  return level * level * 100;
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

const STORAGE_KEY = 'game_account';

// Simple hash function for password (for demo purposes - in production use bcrypt on server)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useGameAuth = () => {
  const [account, setAccount] = useState<GameAccount | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (accountId: string, accountUsername?: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('game_account_id', accountId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // If profile doesn't exist, create it
    if (!data) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          game_account_id: accountId,
          username: accountUsername || 'Jogador',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }

      setProfile(newProfile as UserProfile);
      return newProfile as UserProfile;
    }

    setProfile(data as UserProfile);
    return data as UserProfile;
  }, []);

  // Load account from localStorage on mount
  useEffect(() => {
    const loadAccount = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as GameAccount;
          setAccount(parsed);
          await fetchProfile(parsed.id);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    };
    loadAccount();
  }, [fetchProfile]);

  const register = async (username: string, password: string) => {
    // Check if username exists
    const { data: existing } = await supabase
      .from('game_accounts')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return { error: new Error('Nome de usuário já existe') };
    }

    const passwordHash = await hashPassword(password);

    // Create account
    const { data: newAccount, error: accountError } = await supabase
      .from('game_accounts')
      .insert({ username, password_hash: passwordHash })
      .select()
      .single();

    if (accountError || !newAccount) {
      return { error: accountError || new Error('Erro ao criar conta') };
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        game_account_id: newAccount.id,
        username: username,
      });

    if (profileError) {
      return { error: profileError };
    }

    const gameAccount: GameAccount = {
      id: newAccount.id,
      username: newAccount.username,
      created_at: newAccount.created_at,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameAccount));
    setAccount(gameAccount);
    
    // Fetch profile and set it directly
    const profileData = await fetchProfile(newAccount.id);
    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    return { error: null };
  };

  const login = async (username: string, password: string) => {
    const passwordHash = await hashPassword(password);

    const { data, error } = await supabase
      .from('game_accounts')
      .select('*')
      .eq('username', username)
      .eq('password_hash', passwordHash)
      .maybeSingle();

    if (error) {
      return { error };
    }

    if (!data) {
      return { error: new Error('Usuário ou senha incorretos') };
    }

    const gameAccount: GameAccount = {
      id: data.id,
      username: data.username,
      created_at: data.created_at,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameAccount));
    setAccount(gameAccount);
    
    // Fetch profile and wait for it
    const profileData = await fetchProfile(data.id);
    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    return { error: null };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAccount(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'username' | 'avatar_url'>>) => {
    if (!account) return { error: new Error('Não autenticado') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('game_account_id', account.id);

    if (!error) {
      await fetchProfile(account.id);
    }
    return { error };
  };

  const addXp = async (amount: number) => {
    if (!account || !profile) return { error: new Error('Não autenticado'), leveledUp: false };

    const newXp = profile.xp + amount;
    const oldLevel = profile.level;
    const newLevel = getLevelFromXp(newXp);

    const { error } = await supabase
      .from('profiles')
      .update({ xp: newXp, level: newLevel })
      .eq('game_account_id', account.id);

    if (!error) {
      await fetchProfile(account.id);
    }

    return { error, leveledUp: newLevel > oldLevel };
  };

  const refreshProfile = useCallback(() => {
    if (account) {
      fetchProfile(account.id);
    }
  }, [account, fetchProfile]);

  return {
    account,
    profile,
    loading,
    isLoggedIn: !!account,
    register,
    login,
    logout,
    updateProfile,
    addXp,
    refreshProfile,
  };
};
