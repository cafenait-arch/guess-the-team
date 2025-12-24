import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom } from '@/lib/gameUtils';

interface RoundEndProps {
  room: GameRoom;
  players: GamePlayer[];
  currentPlayer: GamePlayer;
}

export const RoundEnd = ({ room, players, currentPlayer }: RoundEndProps) => {
  const [countdown, setCountdown] = useState(5);
  const chooser = players[room.current_chooser_index];
  const isHost = players.find(p => p.is_host)?.id === currentPlayer.id;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const startNextRound = async () => {
    await supabase
      .from('game_rooms')
      .update({
        status: 'choosing',
        current_round: room.current_round + 1,
        current_team: null,
      })
      .eq('id', room.id);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-center">Fim da Rodada {room.current_round}!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="text-4xl">⚽</div>
        
        <div>
          <p className="text-lg mb-2">O time era:</p>
          <p className="text-3xl font-bold text-primary">{room.current_team}</p>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground">Pontuação atual:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map(p => (
              <div key={p.id} className="px-4 py-2 bg-muted rounded-lg">
                <p className="font-medium">{p.name}</p>
                <p className="text-xl font-bold">{p.score} pts</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-2">
            Próximo a escolher: <strong>{chooser?.name}</strong>
          </p>
        </div>

        {isHost && (
          <Button onClick={startNextRound} disabled={countdown > 0}>
            {countdown > 0 ? `Próxima rodada em ${countdown}s` : 'Próxima Rodada'}
          </Button>
        )}

        {!isHost && (
          <p className="text-muted-foreground">
            Aguardando o host iniciar a próxima rodada...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
