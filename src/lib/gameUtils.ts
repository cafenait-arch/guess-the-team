export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Levenshtein distance algorithm for fuzzy matching
export const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
};

// Calculate similarity percentage between two strings
export const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(s1, s2);
  return ((maxLen - distance) / maxLen) * 100;
};

// Check if guess is at least 85% similar
export const isGuessCorrect = (guess: string, actual: string): boolean => {
  const similarity = calculateSimilarity(guess, actual);
  return similarity >= 85;
};

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: 'waiting' | 'choosing' | 'playing' | 'round_end' | 'game_over';
  max_guesses: number;
  max_questions: number;
  max_rounds: number;
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
  user_id: string | null;
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

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  message: string;
  created_at: string;
}
