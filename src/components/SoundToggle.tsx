import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '@/lib/sounds';

export const SoundToggle = () => {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(soundManager.isEnabled());
  }, []);

  const toggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    soundManager.setEnabled(newState);
    if (newState) {
      soundManager.playClick();
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} title={enabled ? 'Desativar som' : 'Ativar som'}>
      {enabled ? (
        <Volume2 className="w-5 h-5 text-white" />
      ) : (
        <VolumeX className="w-5 h-5 text-white opacity-50" />
      )}
    </Button>
  );
};
