import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { generateRoomCode } from '@/lib/gameUtils';
import { useToast } from '@/hooks/use-toast';

interface CreateRoomProps {
  sessionId: string;
  onRoomCreated: (roomId: string, playerId: string) => void;
}

export const CreateRoom = ({ sessionId, onRoomCreated }: CreateRoomProps) => {
  const [playerName, setPlayerName] = useState('');
  const [maxGuesses, setMaxGuesses] = useState(3);
  const [maxQuestions, setMaxQuestions] = useState(30);
  const [maxRounds, setMaxRounds] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!playerName.trim()) {
      toast({ title: 'Digite seu nome', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const code = generateRoomCode();
      
      // Create room
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          code,
          host_id: sessionId,
          max_guesses: maxGuesses,
          max_questions: maxQuestions,
          max_rounds: maxRounds,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('game_players')
        .insert({
          room_id: room.id,
          name: playerName.trim(),
          session_id: sessionId,
          guesses_left: maxGuesses,
          questions_left: maxQuestions,
          player_order: 0,
          is_host: true,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      onRoomCreated(room.id, player.id);
    } catch (error) {
      console.error('Error creating room:', error);
      toast({ title: 'Erro ao criar sala', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-center text-lg sm:text-xl">Criar Sala</CardTitle>
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
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="guesses" className="text-sm">Chutes por Pessoa</Label>
            <Input
              id="guesses"
              type="number"
              min={1}
              max={10}
              value={maxGuesses}
              onChange={(e) => setMaxGuesses(Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="questions" className="text-sm">Perguntas por Pessoa</Label>
            <Input
              id="questions"
              type="number"
              min={1}
              max={50}
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rounds">Número de Rodadas</Label>
          <Input
            id="rounds"
            type="number"
            min={1}
            max={10}
            value={maxRounds}
            onChange={(e) => setMaxRounds(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            1 rodada = cada jogador escolhe um time uma vez
          </p>
        </div>

        <Button 
          className="w-full" 
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Criando...' : 'Criar Sala'}
        </Button>
      </CardContent>
    </Card>
  );
};
