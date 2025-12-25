import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GamePlayer } from '@/lib/gameUtils';
import { Trophy, Medal, Star } from 'lucide-react';
import { useEffect } from 'react';
import { soundManager } from '@/lib/sounds';

interface GameOverProps {
  players: GamePlayer[];
  onPlayAgain: () => void;
  currentPlayerId?: string;
}

export const GameOver = ({ players, onPlayAgain, currentPlayerId }: GameOverProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isWinner = currentPlayerId === winner?.id;

  useEffect(() => {
    // Play victory or game over sound
    if (isWinner) {
      soundManager.playSuccess();
    }
  }, [isWinner]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-center flex items-center justify-center gap-2 text-lg sm:text-xl">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
          Fim de Jogo!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <p className="text-base sm:text-lg text-muted-foreground">Vencedor</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">{winner?.name}</p>
          <p className="text-lg sm:text-xl">{winner?.score} pontos</p>
          {isWinner && (
            <div className="flex items-center justify-center gap-1 mt-2 text-yellow-500">
              <Star className="w-4 h-4" />
              <span className="text-sm">Você venceu! +50 XP</span>
              <Star className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-3">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id}
              className={`flex items-center justify-between p-3 sm:p-4 rounded-lg ${
                index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                index === 1 ? 'bg-gray-100 dark:bg-gray-800' :
                index === 2 ? 'bg-orange-100 dark:bg-orange-900/30' :
                'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {index < 3 && (
                  <Medal className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    'text-orange-500'
                  }`} />
                )}
                <span className="font-medium text-sm sm:text-base">{index + 1}º {player.name}</span>
                {player.id === currentPlayerId && (
                  <span className="text-xs text-muted-foreground">(você)</span>
                )}
              </div>
              <span className="font-bold text-sm sm:text-base">{player.score} pts</span>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>🎮 Todos os jogadores ganham +50 XP por completar a partida!</p>
        </div>

        <Button className="w-full" onClick={onPlayAgain}>
          Jogar Novamente
        </Button>
      </CardContent>
    </Card>
  );
};
