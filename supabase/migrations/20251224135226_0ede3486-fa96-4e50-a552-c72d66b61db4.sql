-- Criar tabela de salas de jogo
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  max_guesses INTEGER NOT NULL DEFAULT 3,
  max_questions INTEGER NOT NULL DEFAULT 30,
  current_round INTEGER NOT NULL DEFAULT 0,
  current_chooser_index INTEGER NOT NULL DEFAULT 0,
  current_team VARCHAR(100),
  current_turn_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de jogadores
CREATE TABLE public.game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  session_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  guesses_left INTEGER NOT NULL DEFAULT 3,
  questions_left INTEGER NOT NULL DEFAULT 30,
  player_order INTEGER NOT NULL DEFAULT 0,
  is_host BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de perguntas/respostas do jogo
CREATE TABLE public.game_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  player_id UUID NOT NULL REFERENCES public.game_players(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer VARCHAR(20),
  is_guess BOOLEAN NOT NULL DEFAULT false,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pontuação final
CREATE TABLE public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.game_players(id) ON DELETE CASCADE,
  final_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Desabilitar RLS para acesso público (jogo sem autenticação)
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para o jogo (sem autenticação necessária)
CREATE POLICY "Allow public read on game_rooms" ON public.game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_rooms" ON public.game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_rooms" ON public.game_rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on game_rooms" ON public.game_rooms FOR DELETE USING (true);

CREATE POLICY "Allow public read on game_players" ON public.game_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_players" ON public.game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_players" ON public.game_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on game_players" ON public.game_players FOR DELETE USING (true);

CREATE POLICY "Allow public read on game_questions" ON public.game_questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_questions" ON public.game_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on game_questions" ON public.game_questions FOR UPDATE USING (true);

CREATE POLICY "Allow public read on game_scores" ON public.game_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on game_scores" ON public.game_scores FOR INSERT WITH CHECK (true);

-- Habilitar realtime para sincronização
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_questions;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();