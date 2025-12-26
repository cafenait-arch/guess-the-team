import { useState } from 'react';
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
import { Settings, Star, Trophy } from 'lucide-react';

interface ProfileCardProps {
  profile: UserProfile;
  compact?: boolean;
}

export const ProfileCard = ({ profile, compact = false }: ProfileCardProps) => {
  const { updateProfile } = useGameAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);

  const xpProgress = getXpProgress(profile.xp);

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
                  <Label htmlFor="avatar">URL da foto de perfil</Label>
                  <Input
                    id="avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                  {avatarUrl && (
                    <div className="flex justify-center">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>Preview</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
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

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">XP</span>
            <span className="font-medium">{profile.xp} total</span>
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
