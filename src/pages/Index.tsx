import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateRoom } from '@/components/game/CreateRoom';
import { JoinRoom } from '@/components/game/JoinRoom';
import { GameRoom } from '@/components/game/GameRoom';
import { GameAuthPage } from '@/components/auth/GameAuthPage';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileBadge } from '@/components/profile/ProfileBadge';
import { SoundToggle } from '@/components/SoundToggle';
import { useGameSession } from '@/hooks/useGameSession';
import { useGameAuth } from '@/hooks/useGameAuth';
import { LogOut, User } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const Index = () => {
  const { sessionId, roomId, playerId, isLoading: sessionLoading, setRoom, clearRoom } = useGameSession();
  const { account, profile, loading: authLoading, logout, isLoggedIn } = useGameAuth();

  const handleRoomCreated = (newRoomId: string, newPlayerId: string) => {
    setRoom(newRoomId, newPlayerId);
  };

  const handleRoomJoined = (joinedRoomId: string, joinedPlayerId: string) => {
    setRoom(joinedRoomId, joinedPlayerId);
  };

  const handleLeave = () => {
    clearRoom();
  };

  const handleLogout = () => {
    logout();
    clearRoom();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
        <div className="animate-spin text-4xl">⚽</div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!isLoggedIn || !account) {
    return <GameAuthPage />;
  }

  // Show loading while checking session
  if (!sessionId || sessionLoading) {
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
            <div className="flex items-center gap-2">
              <SoundToggle />
              {profile && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="w-5 h-5 text-white" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <ProfileCard profile={profile} />
                  </DialogContent>
                </Dialog>
              )}
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
          </div>
          <GameRoom 
            roomId={roomId} 
            playerId={playerId} 
            sessionId={sessionId}
            onLeave={handleLeave}
            userId={account.id}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-4">
      {/* Header with logout */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <SoundToggle />
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5 text-white" />
        </Button>
      </div>

      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">⚽ Adivinhe o Time</h1>
        <p className="text-green-200 text-sm sm:text-base">Jogo multiplayer de adivinhação de times de futebol</p>
      </div>

      {/* Profile Card visible on main screen */}
      {profile && (
        <div className="w-full max-w-md mb-6">
          <ProfileCard profile={profile} />
        </div>
      )}

      <Tabs defaultValue="join" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="join" className="text-sm sm:text-base">Entrar em Sala</TabsTrigger>
          <TabsTrigger value="create" className="text-sm sm:text-base">Criar Sala</TabsTrigger>
        </TabsList>
        <TabsContent value="join">
          <JoinRoom 
            sessionId={sessionId} 
            onRoomJoined={handleRoomJoined}
            userId={account.id}
            displayName={profile?.username || account.username}
          />
        </TabsContent>
        <TabsContent value="create">
          <CreateRoom 
            sessionId={sessionId} 
            onRoomCreated={handleRoomCreated}
            userId={account.id}
            displayName={profile?.username || account.username}
          />
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
        <p className="mt-3 text-yellow-300">🎮 Ganhe XP ao jogar e suba de nível!</p>
      </div>
    </div>
  );
};

export default Index;
