import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom, GameQuestion } from '@/lib/gameUtils';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, Target, Eye } from 'lucide-react';

interface PlayingPhaseProps {
  room: GameRoom;
  players: GamePlayer[];
  currentPlayer: GamePlayer;
}

export const PlayingPhase = ({ room, players, currentPlayer }: PlayingPhaseProps) => {
  const [input, setInput] = useState('');
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const { toast } = useToast();

  const chooser = players[room.current_chooser_index];
  const isChooser = chooser?.id === currentPlayer.id;
  const currentTurnPlayer = players[room.current_turn_index];
  const isMyTurn = currentTurnPlayer?.id === currentPlayer.id && !isChooser;

  useEffect(() => {
    fetchQuestions();

    const channel = supabase
      .channel('questions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_questions', filter: `room_id=eq.${room.id}` },
        () => fetchQuestions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, room.current_round]);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('game_questions')
      .select('*')
      .eq('room_id', room.id)
      .eq('round', room.current_round)
      .order('created_at', { ascending: true });

    if (data) {
      setQuestions(data as GameQuestion[]);
    }
  };

  const getNextTurnIndex = () => {
    const guessers = players.filter(p => p.id !== chooser.id);
    const currentGuesserArrayIndex = guessers.findIndex(p => p.id === currentTurnPlayer.id);
    const nextGuesserArrayIndex = (currentGuesserArrayIndex + 1) % guessers.length;
    return players.findIndex(p => p.id === guessers[nextGuesserArrayIndex].id);
  };

  const checkRoundEnd = async () => {
    // Check if all guessers have no guesses left
    const guessers = players.filter(p => p.id !== chooser.id);
    const { data: updatedPlayers } = await supabase
      .from('game_players')
      .select('*')
      .eq('room_id', room.id);

    if (updatedPlayers) {
      const updatedGuessers = updatedPlayers.filter(
        (p: GamePlayer) => p.id !== chooser.id
      );
      const allOutOfGuesses = updatedGuessers.every(
        (p: GamePlayer) => p.guesses_left <= 0
      );

      if (allOutOfGuesses) {
        // Chooser gets points for stumping everyone
        await supabase
          .from('game_players')
          .update({ score: chooser.score + 3 })
          .eq('id', chooser.id);

        await endRound();
      }
    }
  };

  const endRound = async () => {
    const nextChooserIndex = (room.current_chooser_index + 1) % players.length;
    const allPlayedAsChooser = room.current_round >= players.length;

    if (allPlayedAsChooser) {
      await supabase
        .from('game_rooms')
        .update({ status: 'game_over' })
        .eq('id', room.id);
    } else {
      await supabase
        .from('game_rooms')
        .update({
          status: 'round_end',
          current_chooser_index: nextChooserIndex,
        })
        .eq('id', room.id);
    }
  };

  const handleAskQuestion = async () => {
    if (!input.trim()) return;
    if (currentPlayer.questions_left <= 0) {
      toast({ title: 'Você não tem mais perguntas', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await supabase.from('game_questions').insert({
        room_id: room.id,
        round: room.current_round,
        player_id: currentPlayer.id,
        question: input.trim(),
        is_guess: false,
      });

      await supabase
        .from('game_players')
        .update({ questions_left: currentPlayer.questions_left - 1 })
        .eq('id', currentPlayer.id);

      setInput('');
    } catch (error) {
      console.error('Error asking question:', error);
      toast({ title: 'Erro ao enviar pergunta', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async () => {
    if (!input.trim()) return;
    if (currentPlayer.guesses_left <= 0) {
      toast({ title: 'Você não tem mais chutes', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const isCorrect = input.trim().toLowerCase() === room.current_team?.toLowerCase();

      await supabase.from('game_questions').insert({
        room_id: room.id,
        round: room.current_round,
        player_id: currentPlayer.id,
        question: input.trim(),
        is_guess: true,
        is_correct: isCorrect,
      });

      await supabase
        .from('game_players')
        .update({ guesses_left: currentPlayer.guesses_left - 1 })
        .eq('id', currentPlayer.id);

      if (isCorrect) {
        // Award points
        await supabase
          .from('game_players')
          .update({ score: currentPlayer.score + 5 })
          .eq('id', currentPlayer.id);

        toast({ title: '🎉 Você acertou!' });
        await endRound();
      } else {
        toast({ title: '❌ Errado!', variant: 'destructive' });
        
        // Move to next turn
        const nextIndex = getNextTurnIndex();
        await supabase
          .from('game_rooms')
          .update({ current_turn_index: nextIndex })
          .eq('id', room.id);

        // Check if round should end
        await checkRoundEnd();
      }

      setInput('');
    } catch (error) {
      console.error('Error guessing:', error);
      toast({ title: 'Erro ao chutar', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId: string, answer: 'sim' | 'não' | 'talvez') => {
    setLoading(true);
    try {
      await supabase
        .from('game_questions')
        .update({ answer })
        .eq('id', questionId);

      // Move to next turn
      const nextIndex = getNextTurnIndex();
      await supabase
        .from('game_rooms')
        .update({ current_turn_index: nextIndex })
        .eq('id', room.id);
    } catch (error) {
      console.error('Error answering:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingQuestion = questions.find(q => !q.answer && !q.is_guess);
  const getPlayerName = (playerId: string) => players.find(p => p.id === playerId)?.name || 'Jogador';

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Rodada {room.current_round}</CardTitle>
          <div className="flex gap-2">
            {players.map(p => (
              <Badge 
                key={p.id} 
                variant={p.id === currentTurnPlayer?.id ? 'default' : 'outline'}
              >
                {p.name}: {p.score}pts
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chooser View */}
        {isChooser && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="font-medium">Seu time: 
                <span className="ml-2">
                  {showTeam ? room.current_team : '••••••••'}
                </span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowTeam(!showTeam)}>
                <Eye className="w-4 h-4 mr-1" />
                {showTeam ? 'Esconder' : 'Mostrar'}
              </Button>
            </div>
          </div>
        )}

        {/* Current Turn Info */}
        <div className="text-center p-3 bg-muted rounded-lg">
          {pendingQuestion && isChooser ? (
            <p>Responda a pergunta de <strong>{getPlayerName(pendingQuestion.player_id)}</strong></p>
          ) : isMyTurn ? (
            <p className="font-bold text-primary">É sua vez de perguntar ou chutar!</p>
          ) : (
            <p>Vez de <strong>{currentTurnPlayer?.name}</strong></p>
          )}
        </div>

        {/* Questions History */}
        <ScrollArea className="h-48 border rounded-lg p-3">
          {questions.length === 0 ? (
            <p className="text-muted-foreground text-center">Nenhuma pergunta ainda</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div 
                  key={q.id} 
                  className={`p-2 rounded ${q.is_guess ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'}`}
                >
                  <div className="flex items-start gap-2">
                    {q.is_guess ? (
                      <Target className="w-4 h-4 mt-1 text-yellow-600" />
                    ) : (
                      <HelpCircle className="w-4 h-4 mt-1 text-blue-600" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">
                        <strong>{getPlayerName(q.player_id)}:</strong> {q.question}
                      </p>
                      {q.answer && (
                        <Badge variant={q.answer === 'sim' ? 'default' : q.answer === 'não' ? 'destructive' : 'secondary'}>
                          {q.answer}
                        </Badge>
                      )}
                      {q.is_correct !== null && (
                        <Badge variant={q.is_correct ? 'default' : 'destructive'}>
                          {q.is_correct ? '✓ Correto!' : '✗ Errado'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Answer Buttons for Chooser */}
        {isChooser && pendingQuestion && (
          <div className="flex gap-2 justify-center">
            <Button onClick={() => handleAnswer(pendingQuestion.id, 'sim')} disabled={loading}>
              Sim
            </Button>
            <Button onClick={() => handleAnswer(pendingQuestion.id, 'não')} variant="destructive" disabled={loading}>
              Não
            </Button>
            <Button onClick={() => handleAnswer(pendingQuestion.id, 'talvez')} variant="secondary" disabled={loading}>
              Talvez
            </Button>
          </div>
        )}

        {/* Input for current turn player */}
        {isMyTurn && !pendingQuestion && (
          <div className="space-y-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta ou chute..."
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            />
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                variant="outline" 
                onClick={handleAskQuestion}
                disabled={loading || currentPlayer.questions_left <= 0}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Perguntar ({currentPlayer.questions_left} restantes)
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleGuess}
                disabled={loading || currentPlayer.guesses_left <= 0}
              >
                <Target className="w-4 h-4 mr-2" />
                Chutar ({currentPlayer.guesses_left} restantes)
              </Button>
            </div>
          </div>
        )}

        {/* Waiting message */}
        {!isMyTurn && !isChooser && (
          <p className="text-center text-muted-foreground">
            Aguarde sua vez...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
