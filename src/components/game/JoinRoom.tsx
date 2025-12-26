import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/lib/sounds';

interface JoinRoomProps {
  sessionId: string;
  onRoomJoined: (roomId: string, playerId: string) => void;
  userId?: string;
  displayName: string;
}

export const JoinRoom = ({ sessionId, onRoomJoined, userId, displayName }: JoinRoomProps) => {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!displayName) {
      toast({ title: 'Nome não encontrado', variant: 'destructive' });
      return;
    }
    if (!roomCode.trim()) {
      toast({ title: 'Digite o código da sala', variant: 'destructive' });
      return;
    }

    setLoading(true);
    soundManager.playClick();
    const cleanCode = roomCode.trim().toUpperCase();
    
    try {
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (roomError) throw roomError;
      if (!room) {
        toast({ title: 'Sala não encontrada', variant: 'destructive' });
        soundManager.playError();
        return;
      }

      if (room.status !== 'waiting') {
        toast({ title: 'Jogo já começou', variant: 'destructive' });
        soundManager.playError();
        return;
      }

      const { data: players, error: countError } = await supabase
        .from('game_players')
        .select('id')
        .eq('room_id', room.id);

      if (countError) throw countError;

      const existingPlayer = await supabase
        .from('game_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingPlayer.data) {
        soundManager.playGameStart();
        onRoomJoined(room.id, existingPlayer.data.id);
        return;
      }

      const { data: player, error: playerError } = await supabase
        .from('game_players')
        .insert({
          room_id: room.id,
          name: displayName,
          session_id: sessionId,
          guesses_left: room.max_guesses,
          questions_left: room.max_questions,
          player_order: players?.length || 0,
          is_host: false,
          user_id: userId || null,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      soundManager.playGameStart();
      onRoomJoined(room.id, player.id);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({ title: 'Erro ao entrar na sala', variant: 'destructive' });
      soundManager.playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-center text-lg sm:text-xl">Entrar em Sala</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Jogando como:</p>
          <p className="font-bold text-lg">{displayName}</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="code">Código da Sala</Label>
          <Input
            id="code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Ex: ABC123"
            maxLength={6}
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </CardContent>
    </Card>
  );
};
