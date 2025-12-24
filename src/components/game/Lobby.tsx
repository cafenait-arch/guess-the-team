import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom } from '@/lib/gameUtils';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users } from 'lucide-react';

interface LobbyProps {
  roomId: string;
  playerId: string;
  sessionId: string;
}

export const Lobby = ({ roomId, playerId, sessionId }: LobbyProps) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoomData();
    
    // Subscribe to room changes
    const roomChannel = supabase
      .channel('room-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => fetchRoomData()
      )
      .subscribe();

    // Subscribe to player changes
    const playerChannel = supabase
      .channel('player-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => fetchRoomData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
    };
  }, [roomId]);

  const fetchRoomData = async () => {
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomData) {
      setRoom(roomData as GameRoom);
      setIsHost(roomData.host_id === sessionId);
    }

    const { data: playersData } = await supabase
      .from('game_players')
      .select('*')
      .eq('room_id', roomId)
      .order('player_order');

    if (playersData) {
      setPlayers(playersData as GamePlayer[]);
    }
  };

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      toast({ title: 'Código copiado!' });
    }
  };

  const startGame = async () => {
    if (players.length < 2) {
      toast({ title: 'Mínimo 2 jogadores', variant: 'destructive' });
      return;
    }

    await supabase
      .from('game_rooms')
      .update({ status: 'choosing', current_round: 1 })
      .eq('id', roomId);
  };

  if (!room) return <div className="text-center">Carregando...</div>;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Users className="w-6 h-6" />
          Sala de Espera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Código da Sala</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold tracking-wider">{room.code}</span>
            <Button variant="ghost" size="icon" onClick={copyCode}>
              <Copy className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Jogadores ({players.length}/4)
          </p>
          <div className="space-y-2">
            {players.map((player) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <span className="font-medium">{player.name}</span>
                {player.is_host && (
                  <Badge variant="secondary">Host</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          <p>Chutes: {room.max_guesses} | Perguntas: {room.max_questions}</p>
        </div>

        {isHost && (
          <Button 
            className="w-full" 
            onClick={startGame}
            disabled={players.length < 2}
          >
            Iniciar Jogo ({players.length < 2 ? 'mín 2 jogadores' : 'Pronto!'})
          </Button>
        )}

        {!isHost && (
          <p className="text-center text-muted-foreground">
            Aguardando o host iniciar o jogo...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
