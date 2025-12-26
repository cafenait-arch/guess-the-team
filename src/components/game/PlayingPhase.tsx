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
import { PlayerSidebar } from './PlayerSidebar';

interface PlayerProfile {
  username: string | null;
  avatar_url: string | null;
  level: number;
}

interface PlayerWithProfile extends GamePlayer {
  profile?: PlayerProfile | null;
}

interface PlayingPhaseProps {
  room: GameRoom;
  players: PlayerWithProfile[];
  currentPlayer: GamePlayer;
  onCorrectGuess?: () => void;
  isHost?: boolean;
  onKickPlayer?: (playerId: string) => void;
}

export const PlayingPhase = ({ room, players, currentPlayer, onCorrectGuess, isHost = false, onKickPlayer }: PlayingPhaseProps) => {
  const [input, setInput] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const { toast } = useToast();

  const chooser = players[room.current_chooser_index];
  const isChooser = chooser?.id === currentPlayer.id;
  const isPlayerHost = currentPlayer.is_host;

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
      toast({ title: 'Pergunta enviada!' });
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

      // Update player's guess statistics in profile
      if (currentPlayer.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('correct_guesses, total_guesses')
          .eq('game_account_id', currentPlayer.user_id)
          .maybeSingle();
        
        if (profile) {
          await supabase
            .from('profiles')
            .update({
              correct_guesses: (profile.correct_guesses || 0) + (isCorrect ? 1 : 0),
              total_guesses: (profile.total_guesses || 0) + 1
            })
            .eq('game_account_id', currentPlayer.user_id);
        }
      }

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

  // Get all pending questions (not answered and not guesses)
  const pendingQuestions = questions.filter(q => !q.answer && !q.is_guess);
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.profile?.username || player?.name || 'Jogador';
  };

  // Check if current player can ask (not chooser and has questions left)
  const canAsk = !isChooser && currentPlayer.questions_left > 0;
  const canGuess = !isChooser && currentPlayer.guesses_left > 0;
  
  // Check if player is spectating (no guesses left and not chooser)
  const isSpectating = !isChooser && currentPlayer.guesses_left <= 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full max-w-4xl">
      {/* Player Sidebar - Left Side */}
      <PlayerSidebar
        players={players}
        currentPlayerId={currentPlayer.id}
        chooserId={chooser?.id}
        isHost={isHost}
        onKickPlayer={onKickPlayer}
      />

      {/* Main Game Card */}
      <Card className="flex-1">
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-lg sm:text-xl">Rodada {room.current_round}</CardTitle>
          </div>
          {isPlayerHost && (
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
          {/* Spectator Mode Notice */}
          {isSpectating && (
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-300 dark:border-orange-700">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Modo Espectador
                </p>
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Você não tem mais chutes. Aguarde a rodada terminar.
              </p>
            </div>
          )}

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
              <p className="text-xs text-muted-foreground mt-2">
                Você é o escolhedor! Responda as perguntas dos outros jogadores.
              </p>
            </div>
          )}

          {/* Info for non-choosers (not spectating) */}
          {!isChooser && !isSpectating && (
            <div className="text-center p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-sm sm:text-base font-medium text-primary">
                Faça perguntas ou tente adivinhar o time!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Perguntas: {currentPlayer.questions_left} | Chutes: {currentPlayer.guesses_left}
              </p>
            </div>
          )}

          {/* Questions History */}
          <ScrollArea className="h-40 sm:h-48 border rounded-lg p-2 sm:p-3">
            {questions.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm">Nenhuma pergunta ainda</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div 
                    key={q.id} 
                    className={`p-2 rounded ${q.is_guess ? 'bg-yellow-100 dark:bg-yellow-900/30' : q.answer ? 'bg-muted' : 'bg-blue-100 dark:bg-blue-900/30'}`}
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
                        {!q.answer && !q.is_guess && (
                          <Badge variant="outline" className="mt-1 text-xs animate-pulse">
                            Aguardando resposta...
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

          {/* Answer Buttons for Chooser - Show all pending questions */}
          {isChooser && pendingQuestions.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">
                {pendingQuestions.length} pergunta(s) aguardando resposta:
              </p>
              {pendingQuestions.map((pendingQuestion) => (
                <div key={pendingQuestion.id} className="p-3 border rounded-lg space-y-2 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm">
                    <strong>{getPlayerName(pendingQuestion.player_id)}:</strong> {pendingQuestion.question}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
                      placeholder="Resposta personalizada..."
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
              ))}
            </div>
          )}

          {/* Input for any non-chooser player who is not spectating */}
          {!isChooser && !isSpectating && (
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
                  disabled={loading || !canAsk}
                  size="sm"
                >
                  <HelpCircle className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="truncate">Perguntar ({currentPlayer.questions_left})</span>
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleGuess}
                  disabled={loading || !canGuess}
                  size="sm"
                >
                  <Target className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="truncate">Chutar ({currentPlayer.guesses_left})</span>
                </Button>
              </div>
            </div>
          )}

          {/* Chooser waiting message when no pending questions */}
          {isChooser && pendingQuestions.length === 0 && (
            <p className="text-center text-muted-foreground text-sm">
              Aguardando perguntas dos jogadores...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
