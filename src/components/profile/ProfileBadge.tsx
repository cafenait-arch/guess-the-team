import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/hooks/useGameAuth';
import { Star } from 'lucide-react';

interface ProfileBadgeProps {
  profile: UserProfile;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProfileBadge = ({ profile, showLevel = true, size = 'md' }: ProfileBadgeProps) => {
  const displayName = profile.username || 'Jogador';
  const initials = displayName.slice(0, 2).toUpperCase();

  const sizeClasses = {
    sm: { avatar: 'w-6 h-6', text: 'text-xs', icon: 'w-2.5 h-2.5' },
    md: { avatar: 'w-8 h-8', text: 'text-sm', icon: 'w-3 h-3' },
    lg: { avatar: 'w-10 h-10', text: 'text-base', icon: 'w-4 h-4' },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <Avatar className={classes.avatar}>
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className={classes.text}>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className={`${classes.text} font-medium`}>{displayName}</span>
        {showLevel && (
          <div className="flex items-center gap-1">
            <Star className={`${classes.icon} text-yellow-400`} />
            <span className={`${classes.text} text-muted-foreground`}>Nv. {profile.level}</span>
          </div>
        )}
      </div>
    </div>
  );
};
