import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GamePlayer } from '@/lib/gameUtils';
import { Crown, Eye, UserX } from 'lucide-react';

interface PlayerProfile {
  username: string | null;
  avatar_url: string | null;
  level: number;
}

interface PlayerWithProfile extends GamePlayer {
  profile?: PlayerProfile | null;
}

interface PlayerSidebarProps {
  players: PlayerWithProfile[];
  currentPlayerId: string;
  chooserId?: string;
  isHost: boolean;
  onKickPlayer?: (playerId: string) => void;
}

export const PlayerSidebar = ({ 
  players, 
  currentPlayerId, 
  chooserId,
  isHost,
  onKickPlayer 
}: PlayerSidebarProps) => {
  return (
    <div className="w-full lg:w-64 bg-card border rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span>Jogadores</span>
        <Badge variant="outline" className="text-xs">{players.length}</Badge>
      </h3>
      <ScrollArea className="h-[200px] lg:h-[400px]">
        <div className="space-y-2">
          {players.map((player) => {
            const displayName = player.profile?.username || player.name;
            const initials = displayName.slice(0, 2).toUpperCase();
            const avatarUrl = player.profile?.avatar_url;
            const isChooser = player.id === chooserId;
            const isMe = player.id === currentPlayerId;
            const isSpectating = !isChooser && player.guesses_left <= 0;

            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                  isMe ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                } ${isSpectating ? 'opacity-60' : ''}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                    {isChooser && (
                      <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    )}
                    {isSpectating && (
                      <Eye className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">{player.score} pts</span>
                    {!isChooser && (
                      <span>🎯 {player.guesses_left}</span>
                    )}
                  </div>
                </div>
                {isHost && !isMe && !player.is_host && onKickPlayer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onKickPlayer(player.id)}
                    title="Expulsar jogador"
                  >
                    <UserX className="w-3 h-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};