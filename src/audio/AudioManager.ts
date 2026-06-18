import { Howl } from 'howler';
import { assetUrl } from '../utils/assetUrl';

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

// Per-sprite volume levels as specified in the design doc.
const VOLUME_MAP: Record<SoundId, number> = {
  bubbleHover:   0.25,
  bubbleClick:   0.40,
  liveareaOpen:  0.35,
  liveareaClose: 0.30,
  startButton:   0.45,
  viewToggle:    0.40,
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
      src: [assetUrl('/assets/audio/vita-ui-sounds.webm'), assetUrl('/assets/audio/vita-ui-sounds.mp3')],
      sprite: SPRITE_MAP,
      volume: 1.0,
      mute: this.muted,
    });
    this.initialized = true;
  }

  play(soundId: SoundId): void {
    if (!this.initialized) this.init();
    if (this.muted || !this.howl) return;
    const instanceId = this.howl.play(soundId);
    // Apply per-sprite volume after triggering so volume targets the specific instance.
    this.howl.volume(VOLUME_MAP[soundId], instanceId);
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
