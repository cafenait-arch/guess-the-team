import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateRoom } from '@/components/game/CreateRoom';
import { JoinRoom } from '@/components/game/JoinRoom';
import { GameRoom } from '@/components/game/GameRoom';
import { useGameSession } from '@/hooks/useGameSession';

const Index = () => {
  const sessionId = useGameSession();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const handleRoomCreated = (newRoomId: string, newPlayerId: string) => {
    setRoomId(newRoomId);
    setPlayerId(newPlayerId);
  };

  const handleRoomJoined = (joinedRoomId: string, joinedPlayerId: string) => {
    setRoomId(joinedRoomId);
    setPlayerId(joinedPlayerId);
  };

  const handleLeave = () => {
    setRoomId(null);
    setPlayerId(null);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
        <div className="animate-spin text-4xl">⚽</div>
      </div>
    );
  }

  if (roomId && playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">⚽ Adivinhe o Time</h1>
            <Button variant="outline" size="sm" onClick={handleLeave}>
              Sair
            </Button>
          </div>
          <GameRoom 
            roomId={roomId} 
            playerId={playerId} 
            sessionId={sessionId}
            onLeave={handleLeave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">⚽ Adivinhe o Time</h1>
        <p className="text-green-200">Jogo multiplayer de adivinhação de times de futebol</p>
      </div>

      <Tabs defaultValue="join" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="join">Entrar em Sala</TabsTrigger>
          <TabsTrigger value="create">Criar Sala</TabsTrigger>
        </TabsList>
        <TabsContent value="join">
          <JoinRoom sessionId={sessionId} onRoomJoined={handleRoomJoined} />
        </TabsContent>
        <TabsContent value="create">
          <CreateRoom sessionId={sessionId} onRoomCreated={handleRoomCreated} />
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-green-200 text-sm text-center max-w-md">
        <p><strong>Como jogar:</strong></p>
        <p>1. Crie ou entre em uma sala (2-4 jogadores)</p>
        <p>2. Cada rodada, um jogador escolhe um time secreto</p>
        <p>3. Os outros fazem perguntas (Sim/Não/Talvez) para descobrir</p>
        <p>4. Chute quando achar que sabe! Acertou = 5 pontos</p>
      </div>
    </div>
  );
};

export default Index;
