import './AudioToggle.css';
import { audioManager } from '../../../state/audioState';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

const ICON_UNMUTED = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M2 5.5H4.5L8 2v12l-3.5-3.5H2V5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10.5 5.5c.9.8 1.5 2 1.5 2.5s-.6 1.7-1.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M12.5 3.5c1.5 1.3 2.5 3.1 2.5 4.5s-1 3.2-2.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

const ICON_MUTED = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M2 5.5H4.5L8 2v12l-3.5-3.5H2V5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11 6l3 4M14 6l-3 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

export function createAudioToggle(): ComponentInstance {
  let btn: HTMLButtonElement | null = null;
  let clickHandler: (() => void) | null = null;

  function updateState(isMuted: boolean): void {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isMuted));
    btn.setAttribute(
      'aria-label',
      isMuted ? 'Unmute sound effects' : 'Mute sound effects'
    );
    btn.innerHTML = isMuted ? ICON_MUTED : ICON_UNMUTED;
  }

  return {
    mount(container: HTMLElement): void {
      btn = document.createElement('button');
      btn.className = 'vita-audio-toggle';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Toggle sound effects');

      const muted = audioManager.isMuted;
      updateState(muted);

      clickHandler = () => {
        const nowMuted = audioManager.toggleMute();
        updateState(nowMuted);
      };

      btn.addEventListener('click', clickHandler);
      container.appendChild(btn);
    },

    destroy(): void {
      if (btn && clickHandler) {
        btn.removeEventListener('click', clickHandler);
        btn.remove();
        btn = null;
      }
      clickHandler = null;
    },
  };
}
