import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 45000; // 45 seconds

interface UseInactivityKickProps {
  roomId: string;
  playerId: string;
  isActive: boolean;
  onKicked: () => void;
}

export const useInactivityKick = ({ roomId, playerId, isActive, onKicked }: UseInactivityKickProps) => {
  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const kickPlayer = useCallback(async () => {
    try {
      // Remove player from the room
      await supabase
        .from('game_players')
        .delete()
        .eq('id', playerId);

      toast({
        title: 'Removido por inatividade',
        description: 'Você foi removido da sala por estar inativo por 45 segundos.',
        variant: 'destructive',
      });

      onKicked();
    } catch (error) {
      console.error('Error kicking inactive player:', error);
    }
  }, [playerId, onKicked, toast]);

  useEffect(() => {
    if (!isActive) return;

    // Reset activity on any user interaction
    const handleActivity = () => {
      resetActivity();
    };

    // Listen for various user interactions
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Check for inactivity periodically
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        kickPlayer();
      }
    };

    timeoutRef.current = setInterval(checkInactivity, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);

      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [isActive, resetActivity, kickPlayer]);

  return { resetActivity };
};