import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useGameAuth, getXpProgress, UserProfile } from '@/hooks/useGameAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Star, Trophy, Upload, Gamepad2, Target, Award } from 'lucide-react';

interface ProfileCardProps {
  profile: UserProfile;
  compact?: boolean;
}

export const ProfileCard = ({ profile, compact = false }: ProfileCardProps) => {
  const { updateProfile, account } = useGameAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const xpProgress = getXpProgress(profile.xp);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem deve ter no máximo 2MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${account.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast({ title: 'Foto enviada!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao enviar foto', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      username: username.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Perfil atualizado!' });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const displayName = profile.username || 'Jogador';
  const initials = displayName.slice(0, 2).toUpperCase();
  // Win rate = correct guesses / total guesses (accuracy rate from matches)
  const winRate = profile.total_guesses > 0 
    ? Math.round((profile.correct_guesses / profile.total_guesses) * 100) 
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">{displayName}</span>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-green-200">Nv. {profile.level}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Meu Perfil
          </CardTitle>
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu nome no jogo"
                    maxLength={20}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Foto de perfil</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Enviando...' : 'Enviar foto'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Máximo 2MB, JPG ou PNG
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-bold text-lg">{displayName}</p>
            <Badge variant="secondary" className="mt-1">
              <Star className="w-3 h-3 mr-1 text-yellow-500" />
              Nível {profile.level}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{profile.games_played}</p>
            <p className="text-xs text-muted-foreground">Partidas</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <Award className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{profile.games_won}</p>
            <p className="text-xs text-muted-foreground">Vitórias</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <Target className="w-4 h-4 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">XP Total</span>
            <span className="font-medium">{profile.xp}</span>
          </div>
          <Progress value={xpProgress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {xpProgress.current} / {xpProgress.required} para o próximo nível
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
