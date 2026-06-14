import './ViewToggle.css';
import { ViewState, ViewMode } from '../../../state/viewState';
import { performTransition } from '../../../transitions/ViewTransition';
import { audioManager } from '../../../state/audioState';
import type { ComponentInstance } from '../../../types/component';

// Four classic PlayStation controller symbols arranged in a 2×2 grid (△ ○ / □ ✕).
// Inline SVG avoids icon-font dependencies and stays crisp at any DPI / pixel ratio.
const VITA_ICON_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M6 2.5L9.5 9.5H2.5L6 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="18" cy="6" r="3.5" stroke="currentColor" stroke-width="1.3"/><rect x="2.5" y="14.5" width="7" height="7" rx="0.75" stroke="currentColor" stroke-width="1.3"/><path d="M14.5 14.5L21.5 21.5M21.5 14.5L14.5 21.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

const PRO_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect x="1" y="4.5" width="12" height="8.5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

function getDestinationLabel(current: ViewMode): string {
  return current === 'professional' ? 'PS VITA MODE' : 'PROFESSIONAL VIEW';
}

function getDestinationAriaLabel(current: ViewMode): string {
  return current === 'professional' ? 'Switch to PS Vita Mode' : 'Switch to Professional View';
}

function getIconSvg(current: ViewMode): string {
  return current === 'professional' ? VITA_ICON_SVG : PRO_ICON_SVG;
}

export function createViewToggle(): ComponentInstance {
  let btn: HTMLButtonElement | null = null;
  let isTransitioning = false;

  function updateButton(current: ViewMode): void {
    if (!btn) return;
    const labelEl = btn.querySelector<HTMLSpanElement>('.view-toggle__label');
    const iconEl = btn.querySelector<HTMLSpanElement>('.view-toggle__icon');
    if (labelEl) labelEl.textContent = getDestinationLabel(current);
    if (iconEl) iconEl.innerHTML = getIconSvg(current);
    btn.setAttribute('aria-label', getDestinationAriaLabel(current));
    btn.dataset.currentView = current;
  }

  function handleClick(): void {
    if (isTransitioning || !btn) return;

    const current = ViewState.get();
    const next: ViewMode = current === 'professional' ? 'vita' : 'professional';

    audioManager.play('viewToggle');

    isTransitioning = true;
    btn.classList.add('is-transitioning');
    btn.disabled = true;

    performTransition(next).finally(() => {
      if (!btn) return;
      btn.classList.remove('is-transitioning');
      btn.disabled = false;
      isTransitioning = false;
    });
  }

  function handleViewChange(e: CustomEvent<{ mode: ViewMode }>): void {
    updateButton(e.detail.mode);
  }

  return {
    mount(container: HTMLElement): void {
      const current = ViewState.get();

      btn = document.createElement('button');
      btn.className = 'view-toggle';
      btn.id = 'view-toggle-btn';
      btn.type = 'button';
      btn.setAttribute('aria-live', 'polite');
      btn.setAttribute('aria-label', getDestinationAriaLabel(current));
      btn.dataset.currentView = current;

      btn.innerHTML = `
        <span class="view-toggle__icon">${getIconSvg(current)}</span>
        <span class="view-toggle__label">${getDestinationLabel(current)}</span>
      `;

      btn.addEventListener('click', handleClick);
      window.addEventListener('viewchange', handleViewChange);

      container.appendChild(btn);
    },

    destroy(): void {
      if (btn) {
        btn.removeEventListener('click', handleClick);
        btn.remove();
        btn = null;
      }
      window.removeEventListener('viewchange', handleViewChange);
      isTransitioning = false;
    },
  };
}
