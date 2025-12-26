// Sound effects manager using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
  }

  isEnabled(): boolean {
    const stored = localStorage.getItem('sound_enabled');
    if (stored !== null) {
      this.enabled = stored === 'true';
    }
    return this.enabled;
  }

  // Generate simple tones programmatically
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error('Error playing sound:', e);
    }
  }

  // Success sound (correct guess)
  playSuccess() {
    if (!this.enabled) return;
    this.playTone(523.25, 0.15, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.3), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.3, 'sine', 0.3), 200); // G5
  }

  // Error sound (wrong guess)
  playError() {
    if (!this.enabled) return;
    this.playTone(200, 0.3, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.2), 150);
  }

  // Click/tap sound
  playClick() {
    if (!this.enabled) return;
    this.playTone(800, 0.05, 'sine', 0.1);
  }

  // New message notification
  playNotification() {
    if (!this.enabled) return;
    this.playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(1108.73, 0.15, 'sine', 0.2), 80);
  }

  // Game start sound
  playGameStart() {
    if (!this.enabled) return;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.25), i * 120);
    });
  }

  // Turn change sound
  playTurnChange() {
    if (!this.enabled) return;
    this.playTone(440, 0.1, 'triangle', 0.2);
  }

  // Round end sound
  playRoundEnd() {
    if (!this.enabled) return;
    this.playTone(392, 0.2, 'sine', 0.3);
    setTimeout(() => this.playTone(523.25, 0.3, 'sine', 0.3), 150);
  }

  // Level up sound
  playLevelUp() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.25, 'sine', 0.3), i * 100);
    });
  }

  // XP gain sound
  playXpGain() {
    if (!this.enabled) return;
    this.playTone(600, 0.08, 'sine', 0.15);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.15), 60);
  }
}

export const soundManager = new SoundManager();
