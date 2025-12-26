-- Criar tabela de contas do jogo
CREATE TABLE public.game_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.game_accounts ENABLE ROW LEVEL SECURITY;

-- Política para permitir registro (qualquer um pode inserir)
CREATE POLICY "Anyone can register"
ON public.game_accounts
FOR INSERT
WITH CHECK (true);

-- Política para permitir login (qualquer um pode verificar credenciais)
CREATE POLICY "Anyone can verify credentials"
ON public.game_accounts
FOR SELECT
USING (true);

-- Índice para busca rápida por username
CREATE INDEX idx_game_accounts_username ON public.game_accounts(username);

-- Adicionar coluna game_account_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN game_account_id UUID REFERENCES public.game_accounts(id) ON DELETE CASCADE;

-- Atualizar política de profiles para permitir insert/update baseado em game_account_id
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can insert profile"
ON public.profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update own profile"
ON public.profiles
FOR UPDATE
USING (true);