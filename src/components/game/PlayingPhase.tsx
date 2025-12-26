import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { GamePlayer, GameRoom, GameQuestion, isGuessCorrect } from '@/lib/gameUtils';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/lib/sounds';
import { HelpCircle, Target, Eye, Send, StopCircle } from 'lucide-react';

interface PlayingPhaseProps {
  room: GameRoom;
  players: GamePlayer[];
  currentPlayer: GamePlayer;
  onCorrectGuess?: () => void;
}

export const PlayingPhase = ({ room, players, currentPlayer, onCorrectGuess }: PlayingPhaseProps) => {
  const [input, setInput] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const { toast } = useToast();

  const chooser = players[room.current_chooser_index];
  const isChooser = chooser?.id === currentPlayer.id;
  const currentTurnPlayer = players[room.current_turn_index];
  const isMyTurn = currentTurnPlayer?.id === currentPlayer.id && !isChooser;
  const isHost = currentPlayer.is_host;

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
    const totalRoundsPlayed = room.current_round;
    const totalRoundsNeeded = room.max_rounds * players.length;

    if (totalRoundsPlayed >= totalRoundsNeeded) {
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

  const handleEndGame = async () => {
    if (!isHost) return;
    
    setLoading(true);
    soundManager.playClick();
    try {
      await supabase
        .from('game_rooms')
        .update({ status: 'game_over' })
        .eq('id', room.id);
    } catch (error) {
      console.error('Error ending game:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!input.trim()) return;
    if (currentPlayer.questions_left <= 0) {
      toast({ title: 'Você não tem mais perguntas', variant: 'destructive' });
      soundManager.playError();
      return;
    }

    setLoading(true);
    soundManager.playClick();
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
      soundManager.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async () => {
    if (!input.trim()) return;
    if (currentPlayer.guesses_left <= 0) {
      toast({ title: 'Você não tem mais chutes', variant: 'destructive' });
      soundManager.playError();
      return;
    }

    setLoading(true);
    soundManager.playClick();
    try {
      const isCorrect = isGuessCorrect(input.trim(), room.current_team || '');

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
        await supabase
          .from('game_players')
          .update({ score: currentPlayer.score + 5 })
          .eq('id', currentPlayer.id);

        soundManager.playSuccess();
        toast({ title: 'Você acertou!' });
        onCorrectGuess?.();
        await endRound();
      } else {
        soundManager.playError();
        toast({ title: 'Errado!', variant: 'destructive' });
        
        const nextIndex = getNextTurnIndex();
        await supabase
          .from('game_rooms')
          .update({ current_turn_index: nextIndex })
          .eq('id', room.id);

        await checkRoundEnd();
      }

      setInput('');
    } catch (error) {
      console.error('Error guessing:', error);
      toast({ title: 'Erro ao chutar', variant: 'destructive' });
      soundManager.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId: string, answer: string) => {
    setLoading(true);
    soundManager.playClick();
    try {
      await supabase
        .from('game_questions')
        .update({ answer })
        .eq('id', questionId);

      const nextIndex = getNextTurnIndex();
      await supabase
        .from('game_rooms')
        .update({ current_turn_index: nextIndex })
        .eq('id', room.id);

      soundManager.playTurnChange();
      setCustomAnswer('');
    } catch (error) {
      console.error('Error answering:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAnswer = async (questionId: string) => {
    if (!customAnswer.trim()) return;
    await handleAnswer(questionId, customAnswer.trim());
  };

  const pendingQuestion = questions.find(q => !q.answer && !q.is_guess);
  const getPlayerName = (playerId: string) => players.find(p => p.id === playerId)?.name || 'Jogador';

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-lg sm:text-xl">Rodada {room.current_round}</CardTitle>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {players.map(p => (
              <Badge 
                key={p.id} 
                variant={p.id === currentTurnPlayer?.id ? 'default' : 'outline'}
                className="text-xs"
              >
                {p.name}: {p.score}pts
              </Badge>
            ))}
          </div>
        </div>
        {isHost && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleEndGame}
            disabled={loading}
            className="mt-2"
          >
            <StopCircle className="w-4 h-4 mr-1" />
            Encerrar Jogo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Chooser View */}
        {isChooser && (
          <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-medium text-sm sm:text-base">Seu time: 
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
        <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
          {pendingQuestion && isChooser ? (
            <p className="text-sm sm:text-base">Responda a pergunta de <strong>{getPlayerName(pendingQuestion.player_id)}</strong></p>
          ) : isMyTurn ? (
            <p className="font-bold text-primary text-sm sm:text-base">É sua vez de perguntar ou chutar!</p>
          ) : (
            <p className="text-sm sm:text-base">Vez de <strong>{currentTurnPlayer?.name}</strong></p>
          )}
        </div>

        {/* Questions History */}
        <ScrollArea className="h-40 sm:h-48 border rounded-lg p-2 sm:p-3">
          {questions.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">Nenhuma pergunta ainda</p>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div 
                  key={q.id} 
                  className={`p-2 rounded ${q.is_guess ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'}`}
                >
                  <div className="flex items-start gap-2">
                    {q.is_guess ? (
                      <Target className="w-4 h-4 mt-1 text-yellow-600 flex-shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm break-words">
                        <strong>{getPlayerName(q.player_id)}:</strong> {q.question}
                      </p>
                      {q.answer && (
                        <Badge 
                          variant={
                            q.answer.toLowerCase() === 'sim' ? 'default' : 
                            q.answer.toLowerCase() === 'não' ? 'destructive' : 'secondary'
                          }
                          className="mt-1 text-xs"
                        >
                          {q.answer}
                        </Badge>
                      )}
                      {q.is_correct !== null && (
                        <Badge variant={q.is_correct ? 'default' : 'destructive'} className="mt-1 text-xs">
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
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={() => handleAnswer(pendingQuestion.id, 'Sim')} disabled={loading} size="sm">
                Sim
              </Button>
              <Button onClick={() => handleAnswer(pendingQuestion.id, 'Não')} variant="destructive" disabled={loading} size="sm">
                Não
              </Button>
              <Button onClick={() => handleAnswer(pendingQuestion.id, 'Talvez')} variant="secondary" disabled={loading} size="sm">
                Talvez
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                placeholder="Ou digite uma resposta personalizada..."
                onKeyDown={(e) => e.key === 'Enter' && handleCustomAnswer(pendingQuestion.id)}
                maxLength={100}
              />
              <Button 
                onClick={() => handleCustomAnswer(pendingQuestion.id)} 
                disabled={loading || !customAnswer.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Input for current turn player */}
        {isMyTurn && !pendingQuestion && (
          <div className="space-y-2 sm:space-y-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta ou chute..."
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                className="flex-1" 
                variant="outline" 
                onClick={handleAskQuestion}
                disabled={loading || currentPlayer.questions_left <= 0}
                size="sm"
              >
                <HelpCircle className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="truncate">Perguntar ({currentPlayer.questions_left})</span>
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleGuess}
                disabled={loading || currentPlayer.guesses_left <= 0}
                size="sm"
              >
                <Target className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="truncate">Chutar ({currentPlayer.guesses_left})</span>
              </Button>
            </div>
          </div>
        )}

        {/* Waiting message */}
        {!isMyTurn && !isChooser && (
          <p className="text-center text-muted-foreground text-sm">
            Aguarde sua vez...
          </p>
        )}
      </CardContent>
    </Card>
  );
};
