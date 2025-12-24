import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JoinRoomProps {
  sessionId: string;
  onRoomJoined: (roomId: string, playerId: string) => void;
}

export const JoinRoom = ({ sessionId, onRoomJoined }: JoinRoomProps) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast({ title: 'Digite seu nome', variant: 'destructive' });
      return;
    }
    if (!roomCode.trim()) {
      toast({ title: 'Digite o código da sala', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Find room
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .maybeSingle();

      if (roomError) throw roomError;
      if (!room) {
        toast({ title: 'Sala não encontrada', variant: 'destructive' });
        return;
      }

      if (room.status !== 'waiting') {
        toast({ title: 'Jogo já começou', variant: 'destructive' });
        return;
      }

      // Check player count
      const { data: players, error: countError } = await supabase
        .from('game_players')
        .select('id')
        .eq('room_id', room.id);

      if (countError) throw countError;
      if (players && players.length >= 4) {
        toast({ title: 'Sala cheia (máx 4 jogadores)', variant: 'destructive' });
        return;
      }

      // Check if already in room
      const existingPlayer = await supabase
        .from('game_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingPlayer.data) {
        onRoomJoined(room.id, existingPlayer.data.id);
        return;
      }

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('game_players')
        .insert({
          room_id: room.id,
          name: playerName.trim(),
          session_id: sessionId,
          guesses_left: room.max_guesses,
          questions_left: room.max_questions,
          player_order: players?.length || 0,
          is_host: false,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      onRoomJoined(room.id, player.id);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({ title: 'Erro ao entrar na sala', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Entrar em Sala</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Seu Nome</Label>
          <Input
            id="name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Digite seu nome"
            maxLength={50}
          />
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
