import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GamePlayer } from '@/lib/gameUtils';
import { Trophy, Medal } from 'lucide-react';

interface GameOverProps {
  players: GamePlayer[];
  onPlayAgain: () => void;
}

export const GameOver = ({ players, onPlayAgain }: GameOverProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Fim de Jogo!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Vencedor</p>
          <p className="text-3xl font-bold text-primary">{winner?.name}</p>
          <p className="text-xl">{winner?.score} pontos</p>
        </div>

        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                index === 1 ? 'bg-gray-100 dark:bg-gray-800' :
                index === 2 ? 'bg-orange-100 dark:bg-orange-900/30' :
                'bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                {index < 3 && (
                  <Medal className={`w-6 h-6 ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    'text-orange-500'
                  }`} />
                )}
                <span className="font-medium">{index + 1}º {player.name}</span>
              </div>
              <span className="font-bold">{player.score} pts</span>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={onPlayAgain}>
          Jogar Novamente
        </Button>
      </CardContent>
    </Card>
  );
};
