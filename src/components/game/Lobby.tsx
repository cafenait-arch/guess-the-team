import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom } from '@/lib/gameUtils';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Star, UserX } from 'lucide-react';

interface PlayerProfile {
  username: string | null;
  avatar_url: string | null;
  level: number;
}

interface PlayerWithProfile extends GamePlayer {
  profile?: PlayerProfile | null;
}

interface LobbyProps {
  roomId: string;
  playerId: string;
  sessionId: string;
}

export const Lobby = ({ roomId, playerId, sessionId }: LobbyProps) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<PlayerWithProfile[]>([]);
  const [isHost, setIsHost] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoomData();
    
    const roomChannel = supabase
      .channel(`lobby-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => fetchRoomData()
      )
      .subscribe();

    const playerChannel = supabase
      .channel(`lobby-players-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => fetchRoomData()
      )
      .subscribe();

    const pollInterval = setInterval(fetchRoomData, 3000);

    return () => {
      clearInterval(pollInterval);
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
      // Fetch profiles for players with user_id
      const playersWithProfiles: PlayerWithProfile[] = await Promise.all(
        playersData.map(async (player) => {
          if (player.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url, level')
              .eq('game_account_id', player.user_id)
              .maybeSingle();
            return { ...player, profile } as PlayerWithProfile;
          }
          return player as PlayerWithProfile;
        })
      );
      setPlayers(playersWithProfiles);
    }
  };

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      toast({ title: 'Código copiado!' });
    }
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!isHost) return;
    
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

  const startGame = async () => {
    if (players.length < 2) {
      toast({ title: 'Mínimo 2 jogadores', variant: 'destructive' });
      return;
    }

    const randomChooserIndex = Math.floor(Math.random() * players.length);

    // Increment games_played for all players with accounts
    for (const player of players) {
      if (player.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('games_played')
          .eq('game_account_id', player.user_id)
          .maybeSingle();
        
        if (profile) {
          await supabase
            .from('profiles')
            .update({ games_played: (profile.games_played || 0) + 1 })
            .eq('game_account_id', player.user_id);
        }
      }
    }

    await supabase
      .from('game_rooms')
      .update({ 
        status: 'choosing', 
        current_round: 1,
        current_chooser_index: randomChooserIndex
      })
      .eq('id', roomId);
  };

  if (!room) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin text-4xl">⚽</div>
    </div>
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-center flex items-center justify-center gap-2 text-lg sm:text-xl">
          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          Sala de Espera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-2 text-sm">Código da Sala</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-wider">{room.code}</span>
            <Button variant="ghost" size="icon" onClick={copyCode}>
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Jogadores ({players.length})
          </p>
          <div className="space-y-2">
            {players.map((player) => {
              const displayName = player.profile?.username || player.name;
              const initials = displayName.slice(0, 2).toUpperCase();
              const avatarUrl = player.profile?.avatar_url;
              const level = player.profile?.level || 1;
              
              return (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{displayName}</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">Nv. {level}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.is_host && (
                      <Badge variant="secondary" className="text-xs">Host</Badge>
                    )}
                    {isHost && !player.is_host && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleKickPlayer(player.id)}
                        title="Expulsar jogador"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-xs sm:text-sm text-muted-foreground text-center space-y-1">
          <p>Chutes: {room.max_guesses} | Perguntas: {room.max_questions}</p>
          <p>Rodadas: {room.max_rounds}</p>
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
          <p className="text-center text-muted-foreground text-sm">
            Aguardando o host iniciar o jogo...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
