export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'choosing' | 'playing' | 'round_end' | 'game_over';
  max_guesses: number;
  max_questions: number;
  current_round: number;
  current_chooser_index: number;
  current_team: string | null;
  current_turn_index: number;
  created_at: string;
  updated_at: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  name: string;
  session_id: string;
  score: number;
  guesses_left: number;
  questions_left: number;
  player_order: number;
  is_host: boolean;
  created_at: string;
}

export interface GameQuestion {
  id: string;
  room_id: string;
  round: number;
  player_id: string;
  question: string;
  answer: string | null;
  is_guess: boolean;
  is_correct: boolean | null;
  created_at: string;
}
