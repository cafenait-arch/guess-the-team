import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom } from '@/lib/gameUtils';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

interface ChoosingPhaseProps {
  room: GameRoom;
  players: GamePlayer[];
  currentPlayer: GamePlayer;
}

export const ChoosingPhase = ({ room, players, currentPlayer }: ChoosingPhaseProps) => {
  const [team, setTeam] = useState('');
  const [showTeam, setShowTeam] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const chooser = players[room.current_chooser_index];
  const isChooser = chooser?.id === currentPlayer.id;

  const handleChooseTeam = async () => {
    if (!team.trim()) {
      toast({ title: 'Digite o nome do time', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Reset all players' guesses and questions for new round
      for (const player of players) {
        if (player.id !== chooser.id) {
          await supabase
            .from('game_players')
            .update({
              guesses_left: room.max_guesses,
              questions_left: room.max_questions,
            })
            .eq('id', player.id);
        }
      }

      // Find first guesser (not the chooser)
      const guessers = players.filter(p => p.id !== chooser.id);
      const firstGuesserIndex = players.findIndex(p => p.id === guessers[0]?.id);

      await supabase
        .from('game_rooms')
        .update({
          current_team: team.trim(),
          status: 'playing',
          current_turn_index: firstGuesserIndex,
        })
        .eq('id', room.id);
    } catch (error) {
      console.error('Error choosing team:', error);
      toast({ title: 'Erro ao escolher time', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-center">
          Rodada {room.current_round}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isChooser ? (
          <div className="space-y-4">
            <p className="text-center text-lg">
              É sua vez de escolher um time de futebol!
            </p>
            <div className="relative">
              <Input
                type={showTeam ? 'text' : 'password'}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Digite o nome do time..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                onClick={() => setShowTeam(!showTeam)}
              >
                {showTeam ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Ninguém mais pode ver o que você digita!
            </p>
            <Button 
              className="w-full" 
              onClick={handleChooseTeam}
              disabled={loading || !team.trim()}
            >
              {loading ? 'Confirmando...' : 'Confirmar Time'}
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-lg">
              <span className="font-bold">{chooser?.name}</span> está escolhendo um time...
            </p>
            <div className="animate-pulse text-4xl">⚽</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
