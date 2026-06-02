import { Howl } from 'howler';

const AUDIO_MUTE_KEY = 'portfolio_audio_muted';

export type SoundId =
  | 'bubbleHover'
  | 'bubbleClick'
  | 'liveareaOpen'
  | 'liveareaClose'
  | 'startButton'
  | 'viewToggle';

// Sprite map: [offsetMs, durationMs]
const SPRITE_MAP: Record<SoundId, [number, number]> = {
  bubbleHover:   [0,    80],
  bubbleClick:   [200,  150],
  liveareaOpen:  [500,  250],
  liveareaClose: [850,  180],
  startButton:   [1100, 200],
  viewToggle:    [1400, 300],
};

class AudioManager {
  private howl: Howl | null = null;
  private muted: boolean;
  private initialized = false;

  constructor() {
    this.muted = localStorage.getItem(AUDIO_MUTE_KEY) === 'true';
  }

  // Must be called on first user interaction to satisfy browser autoplay policy.
  init(): void {
    if (this.initialized) return;
    this.howl = new Howl({
      src: ['/assets/audio/vita-ui-sounds.webm', '/assets/audio/vita-ui-sounds.mp3'],
      sprite: SPRITE_MAP,
      volume: 1.0,
      mute: this.muted,
    });
    this.initialized = true;
  }

  play(soundId: SoundId): void {
    if (!this.initialized) this.init();
    if (this.muted || !this.howl) return;
    this.howl.play(soundId);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(AUDIO_MUTE_KEY, String(this.muted));
    if (this.howl) this.howl.mute(this.muted);
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }
}

export const audioManager = new AudioManager();
