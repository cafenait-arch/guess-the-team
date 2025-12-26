import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom as GameRoomType } from '@/lib/gameUtils';
import { Lobby } from './Lobby';
import { ChoosingPhase } from './ChoosingPhase';
import { PlayingPhase } from './PlayingPhase';
import { RoundEnd } from './RoundEnd';
import { GameOver } from './GameOver';
import { GameChat } from './GameChat';
import { useGameAuth } from '@/hooks/useGameAuth';
import { useInactivityKick } from '@/hooks/useInactivityKick';
import { soundManager } from '@/lib/sounds';
import { useToast } from '@/hooks/use-toast';

interface PlayerProfile {
  username: string | null;
  avatar_url: string | null;
  level: number;
}

interface PlayerWithProfile extends GamePlayer {
  profile?: PlayerProfile | null;
}

interface GameRoomProps {
  roomId: string;
  playerId: string;
  sessionId: string;
  onLeave: () => void;
  userId?: string;
}

export const GameRoom = ({ roomId, playerId, sessionId, onLeave, userId }: GameRoomProps) => {
  const [room, setRoom] = useState<GameRoomType | null>(null);
  const [players, setPlayers] = useState<PlayerWithProfile[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const xpAwarded = useRef(false);
  const { addXp, profile, account } = useGameAuth();
  const { toast } = useToast();

  // Inactivity kick - only active during playing phase
  useInactivityKick({
    roomId,
    playerId,
    isActive: room?.status === 'playing' || room?.status === 'choosing',
    onKicked: onLeave,
  });

  const handleXpGain = useCallback(async (amount: number, reason: string) => {
    if (!account) return;
    
    const { leveledUp } = await addXp(amount);
    soundManager.playXpGain();
    toast({ title: `+${amount} XP: ${reason}` });
    
    if (leveledUp) {
      setTimeout(() => {
        soundManager.playLevelUp();
        toast({ title: '🎉 Level Up!', description: `Você subiu para o nível ${(profile?.level || 1) + 1}!` });
      }, 500);
    }
  }, [account, addXp, toast, profile]);

  const updateStats = useCallback(async (isWinner: boolean, score: number) => {
    if (!account) return;
    
    // Only update games_won and total_score here (games_played is incremented at game start)
    await supabase
      .from('profiles')
      .update({
        games_won: (profile?.games_won || 0) + (isWinner ? 1 : 0),
        total_score: (profile?.total_score || 0) + score,
      })
      .eq('game_account_id', account.id);
  }, [account, profile]);

  useEffect(() => {
    fetchData();

    // Use unique channel names to avoid conflicts
    const roomChannel = supabase
      .channel(`gameroom-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => fetchData()
      )
      .subscribe();

    const playerChannel = supabase
      .channel(`gameroom-players-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => fetchData()
      )
      .subscribe();

    // Polling fallback for reliability
    const pollInterval = setInterval(fetchData, 3000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
    };
  }, [roomId, playerId]);

  // Play sounds on status change and update stats
  useEffect(() => {
    if (room && prevStatus && room.status !== prevStatus) {
      if (room.status === 'playing') {
        soundManager.playGameStart();
      } else if (room.status === 'round_end') {
        soundManager.playRoundEnd();
      } else if (room.status === 'game_over' && !xpAwarded.current) {
        xpAwarded.current = true;
        // Calculate if winner and update stats
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const isWinner = sortedPlayers[0]?.id === playerId;
        const myScore = currentPlayer?.score || 0;
        
        // Award XP: 50 base + 25 for winner + score
        const xpGain = 50 + (isWinner ? 25 : 0) + myScore;
        handleXpGain(xpGain, isWinner ? 'Vitória!' : 'Partida completa');
        updateStats(isWinner, myScore);
      }
    }
    if (room) {
      setPrevStatus(room.status);
    }
  }, [room?.status, prevStatus, handleXpGain, updateStats, players, playerId, currentPlayer]);

  const fetchData = async () => {
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomData) {
      setRoom(roomData as GameRoomType);
    }

    const { data: playersData } = await supabase
      .from('game_players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_order');

    if (playersData) {
      // Fetch profiles for players with user_id
      const playersWithProfiles: PlayerWithProfile[] = await Promise.all(
        playersData.map(async (player) => {
          if (player.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url, level')
              .eq('game_account_id', player.user_id)
              .maybeSingle();
            return { ...player, profile: profileData } as PlayerWithProfile;
          }
          return player as PlayerWithProfile;
        })
      );
      setPlayers(playersWithProfiles);
      const me = playersData.find((p: GamePlayer) => p.id === playerId);
      if (me) setCurrentPlayer(me as GamePlayer);
    }
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!currentPlayer?.is_host) return;
    
    try {
      await supabase
        .from('game_players')
        .delete()
        .eq('id', targetPlayerId);
      
      toast({ title: 'Jogador expulso da sala' });
    } catch (error) {
      console.error('Error kicking player:', error);
      toast({ title: 'Erro ao expulsar jogador', variant: 'destructive' });
    }
  };

  if (!room || !currentPlayer) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin text-4xl">⚽</div>
      </div>
    );
  }

  const showChat = room.status !== 'waiting' && room.status !== 'game_over';

  return (
    <div className="flex flex-col items-center relative">
      {/* Chat button - fixed position on mobile */}
      {showChat && (
        <div className="fixed bottom-4 right-4 z-50 sm:absolute sm:bottom-auto sm:top-0 sm:right-0">
          <GameChat roomId={roomId} playerId={playerId} players={players} />
        </div>
      )}

      {room.status === 'waiting' && (
        <Lobby roomId={roomId} playerId={playerId} sessionId={sessionId} />
      )}

      {room.status === 'choosing' && (
        <ChoosingPhase room={room} players={players} currentPlayer={currentPlayer} />
      )}

      {room.status === 'playing' && (
        <PlayingPhase 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onCorrectGuess={() => handleXpGain(25, 'Acertou o time')}
          isHost={currentPlayer.is_host}
          onKickPlayer={handleKickPlayer}
        />
      )}

      {room.status === 'round_end' && (
        <RoundEnd room={room} players={players} currentPlayer={currentPlayer} />
      )}

      {room.status === 'game_over' && (
        <GameOver 
          players={players} 
          onPlayAgain={async () => {
            // Reset room to waiting status for lobby
            await supabase
              .from('game_rooms')
              .update({ 
                status: 'waiting',
                current_round: 0,
                current_chooser_index: 0,
                current_turn_index: 0,
                current_team: null
              })
              .eq('id', roomId);
            
            // Reset all players' guesses and questions
            await supabase
              .from('game_players')
              .update({
                score: 0,
                guesses_left: room.max_guesses,
                questions_left: room.max_questions
              })
              .eq('room_id', roomId);
            
            // Reset XP awarded flag for next game
            xpAwarded.current = false;
          }} 
          currentPlayerId={playerId} 
        />
      )}
    </div>
  );
};
