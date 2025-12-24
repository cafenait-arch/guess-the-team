import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom as GameRoomType } from '@/lib/gameUtils';
import { Lobby } from './Lobby';
import { ChoosingPhase } from './ChoosingPhase';
import { PlayingPhase } from './PlayingPhase';
import { RoundEnd } from './RoundEnd';
import { GameOver } from './GameOver';
import { GameChat } from './GameChat';

interface GameRoomProps {
  roomId: string;
  playerId: string;
  sessionId: string;
  onLeave: () => void;
}

export const GameRoom = ({ roomId, playerId, sessionId, onLeave }: GameRoomProps) => {
  const [room, setRoom] = useState<GameRoomType | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(null);

  useEffect(() => {
    fetchData();

    const roomChannel = supabase
      .channel('game-room-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => fetchData()
      )
      .subscribe();

    const playerChannel = supabase
      .channel('game-player-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
    };
  }, [roomId, playerId]);

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
      setPlayers(playersData as GamePlayer[]);
      const me = playersData.find((p: GamePlayer) => p.id === playerId);
      if (me) setCurrentPlayer(me as GamePlayer);
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
        <PlayingPhase room={room} players={players} currentPlayer={currentPlayer} />
      )}

      {room.status === 'round_end' && (
        <RoundEnd room={room} players={players} currentPlayer={currentPlayer} />
      )}

      {room.status === 'game_over' && (
        <GameOver players={players} onPlayAgain={onLeave} />
      )}
    </div>
  );
};
