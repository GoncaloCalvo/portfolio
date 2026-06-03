import type { Project } from '../../../types/project';
import { audioManager } from '../../../state/audioState';

export interface StartZoneInstance {
  mount(container: HTMLElement): void;
  update(project: Project): void;
  destroy(): void;
}

export function createLiveAreaStartZone(): StartZoneInstance {
  let zoneEl: HTMLElement | null = null;
  let startBtn: HTMLAnchorElement | null = null;
  let codeLink: HTMLAnchorElement | null = null;
  let startClickHandler: (() => void) | null = null;

  return {
    mount(container: HTMLElement): void {
      zoneEl = document.createElement('div');
      zoneEl.className = 'vita-livearea-startzone';

      startBtn = document.createElement('a');
      startBtn.className = 'vita-livearea-start-btn';
      startBtn.target = '_blank';
      startBtn.rel = 'noopener noreferrer';
      startBtn.setAttribute('aria-describedby', 'livearea-title');
      startBtn.innerHTML = `
        <span class="vita-start-btn__icon" aria-hidden="true">&#9654;</span>
        <span class="vita-start-btn__label">START</span>
      `;

      startClickHandler = () => audioManager.play('startButton');
      startBtn.addEventListener('click', startClickHandler);

      codeLink = document.createElement('a');
      codeLink.className = 'vita-livearea-code-link';
      codeLink.target = '_blank';
      codeLink.rel = 'noopener noreferrer';
      codeLink.textContent = 'View Source Code';

      zoneEl.appendChild(startBtn);
      zoneEl.appendChild(codeLink);
      container.appendChild(zoneEl);
    },

    update(project: Project): void {
      if (startBtn) {
        startBtn.href = project.links.liveApp ?? project.links.repository;
      }
      if (codeLink) {
        codeLink.href = project.links.repository;
      }
    },

    destroy(): void {
      if (startBtn && startClickHandler) {
        startBtn.removeEventListener('click', startClickHandler);
      }
      startClickHandler = null;
      zoneEl?.remove();
      zoneEl = null;
      startBtn = null;
      codeLink = null;
    },
  };
}
