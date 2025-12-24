import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'game_session_id';
const ROOM_KEY = 'game_room_id';
const PLAYER_KEY = 'game_player_id';

interface GameSessionState {
  sessionId: string;
  roomId: string | null;
  playerId: string | null;
}

export const useGameSession = () => {
  const [state, setState] = useState<GameSessionState>({
    sessionId: '',
    roomId: null,
    playerId: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      // Get or create session ID
      let sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
      }

      // Get stored room and player IDs
      const storedRoomId = localStorage.getItem(ROOM_KEY);
      const storedPlayerId = localStorage.getItem(PLAYER_KEY);

      // Validate if the stored session is still valid
      if (storedRoomId && storedPlayerId) {
        try {
          // Check if room still exists and is not game_over
          const { data: room } = await supabase
            .from('game_rooms')
            .select('id, status')
            .eq('id', storedRoomId)
            .maybeSingle();

          // Check if player still exists in that room
          const { data: player } = await supabase
            .from('game_players')
            .select('id, session_id')
            .eq('id', storedPlayerId)
            .eq('room_id', storedRoomId)
            .maybeSingle();

          if (room && player && player.session_id === sessionId && room.status !== 'game_over') {
            setState({
              sessionId,
              roomId: storedRoomId,
              playerId: storedPlayerId,
            });
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error validating session:', error);
        }

        // Clear invalid stored data
        localStorage.removeItem(ROOM_KEY);
        localStorage.removeItem(PLAYER_KEY);
      }

      setState({
        sessionId,
        roomId: null,
        playerId: null,
      });
      setIsLoading(false);
    };

    initSession();
  }, []);

  const setRoom = useCallback((roomId: string | null, playerId: string | null) => {
    if (roomId && playerId) {
      localStorage.setItem(ROOM_KEY, roomId);
      localStorage.setItem(PLAYER_KEY, playerId);
    } else {
      localStorage.removeItem(ROOM_KEY);
      localStorage.removeItem(PLAYER_KEY);
    }
    setState(prev => ({
      ...prev,
      roomId,
      playerId,
    }));
  }, []);

  const clearRoom = useCallback(() => {
    localStorage.removeItem(ROOM_KEY);
    localStorage.removeItem(PLAYER_KEY);
    setState(prev => ({
      ...prev,
      roomId: null,
      playerId: null,
    }));
  }, []);

  return {
    sessionId: state.sessionId,
    roomId: state.roomId,
    playerId: state.playerId,
    isLoading,
    setRoom,
    clearRoom,
  };
};
