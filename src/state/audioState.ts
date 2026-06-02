// Re-exports the audioManager singleton as the canonical audio state accessor.
// Components should import from here rather than directly from AudioManager.
export { audioManager } from '../audio/AudioManager';
export type { SoundId } from '../audio/AudioManager';
