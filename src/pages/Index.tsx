import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateRoom } from '@/components/game/CreateRoom';
import { JoinRoom } from '@/components/game/JoinRoom';
import { GameRoom } from '@/components/game/GameRoom';
import { useGameSession } from '@/hooks/useGameSession';
import { LogOut } from 'lucide-react';

const Index = () => {
  const { sessionId, roomId, playerId, isLoading, setRoom, clearRoom } = useGameSession();

  const handleRoomCreated = (newRoomId: string, newPlayerId: string) => {
    setRoom(newRoomId, newPlayerId);
  };

  const handleRoomJoined = (joinedRoomId: string, joinedPlayerId: string) => {
    setRoom(joinedRoomId, joinedPlayerId);
  };

  const handleLeave = () => {
    clearRoom();
  };

  if (!sessionId || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
        <div className="animate-spin text-4xl">⚽</div>
      </div>
    );
  }

  if (roomId && playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>⚽</span>
              <span className="hidden sm:inline">Adivinhe o Time</span>
            </h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLeave}
              className="bg-background/80 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
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
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">⚽ Adivinhe o Time</h1>
        <p className="text-green-200 text-sm sm:text-base">Jogo multiplayer de adivinhação de times de futebol</p>
      </div>

      <Tabs defaultValue="join" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="join" className="text-sm sm:text-base">Entrar em Sala</TabsTrigger>
          <TabsTrigger value="create" className="text-sm sm:text-base">Criar Sala</TabsTrigger>
        </TabsList>
        <TabsContent value="join">
          <JoinRoom sessionId={sessionId} onRoomJoined={handleRoomJoined} />
        </TabsContent>
        <TabsContent value="create">
          <CreateRoom sessionId={sessionId} onRoomCreated={handleRoomCreated} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 sm:mt-8 text-green-200 text-xs sm:text-sm text-center max-w-md px-4">
        <p className="font-semibold mb-2">Como jogar:</p>
        <ol className="space-y-1 text-left list-decimal list-inside">
          <li>Crie ou entre em uma sala (mínimo 2 jogadores)</li>
          <li>Cada rodada, um jogador escolhe um time secreto</li>
          <li>Os outros fazem perguntas para descobrir</li>
          <li>O escolhedor responde Sim, Não, Talvez ou personalizado</li>
          <li>Chute quando achar que sabe! (85% de similaridade aceito)</li>
        </ol>
      </div>
    </div>
  );
};

export default Index;
