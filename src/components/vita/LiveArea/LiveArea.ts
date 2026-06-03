import './LiveArea.css';
import type { Project } from '../../../types/project';
import { createLiveAreaBanner } from './LiveAreaBanner';
import { createLiveAreaStartZone } from './LiveAreaStartZone';
import { createLiveAreaPanels } from './LiveAreaPanels';
import { createFocusTrap } from '../../../utils/focusTrap';
import { delay } from '../../../utils/delay';

export interface LiveAreaInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
  open(project: Project, originBubble: HTMLElement, onDim: (dim: boolean) => void): void;
  close(): void;
}

export function createLiveArea(): LiveAreaInstance {
  let overlayEl: HTMLElement | null = null;
  let panelEl: HTMLElement | null = null;
  let backdropEl: HTMLElement | null = null;
  let closeBtn: HTMLButtonElement | null = null;
  let originBubble: HTMLElement | null = null;
  let dimCallback: ((dim: boolean) => void) | null = null;
  let isOpen = false;
  let isAnimating = false;

  const banner = createLiveAreaBanner();
  const startZone = createLiveAreaStartZone();
  const panels = createLiveAreaPanels();

  let focusTrap: ReturnType<typeof createFocusTrap> | null = null;
  let escHandler: ((e: KeyboardEvent) => void) | null = null;

  function handleEsc(e: KeyboardEvent): void {
    if (e.key === 'Escape' && isOpen) close();
  }

  function close(): void {
    if (!isOpen || isAnimating || !overlayEl || !panelEl) return;
    isOpen = false;
    isAnimating = true;

    focusTrap?.deactivate();
    if (escHandler) document.removeEventListener('keydown', escHandler);

    panelEl.style.transition =
      'opacity 200ms ease-in, transform 200ms ease-in';
    panelEl.style.opacity = '0';
    panelEl.style.transform = 'scale(0.94)';

    delay(200).then(() => {
      if (!overlayEl) return;
      overlayEl.hidden = true;
      overlayEl.setAttribute('aria-hidden', 'true');
      overlayEl.removeAttribute('tabindex');

      dimCallback?.(false);
      isAnimating = false;

      // Pulse origin bubble on close
      if (originBubble) {
        const inner = originBubble.querySelector<HTMLElement>('.vita-bubble__inner');
        if (inner) {
          inner.style.transition = 'transform 100ms ease-out';
          inner.style.transform = 'scale(1.08)';
          delay(100).then(() => {
            if (!inner) return;
            inner.style.transform = '';
            delay(100).then(() => {
              inner.style.transition = '';
            });
          });
        }
        originBubble.focus();
        originBubble = null;
      }
    });
  }

  return {
    mount(container: HTMLElement): void {
      overlayEl = document.createElement('div');
      overlayEl.className = 'vita-livearea-overlay';
      overlayEl.setAttribute('role', 'dialog');
      overlayEl.setAttribute('aria-modal', 'true');
      overlayEl.setAttribute('aria-labelledby', 'livearea-title');
      overlayEl.id = 'livearea-overlay';
      overlayEl.hidden = true;
      overlayEl.setAttribute('aria-hidden', 'true');

      backdropEl = document.createElement('div');
      backdropEl.className = 'vita-livearea-backdrop';
      backdropEl.setAttribute('aria-hidden', 'true');

      panelEl = document.createElement('div');
      panelEl.className = 'vita-livearea-panel';

      banner.mount(panelEl);
      startZone.mount(panelEl);
      panels.mount(panelEl);

      closeBtn = document.createElement('button');
      closeBtn.className = 'vita-livearea-close';
      closeBtn.setAttribute('aria-label', 'Close project details');
      closeBtn.type = 'button';
      closeBtn.innerHTML = '<span aria-hidden="true">&#x2715;</span>';
      closeBtn.addEventListener('click', () => close());
      panelEl.appendChild(closeBtn);

      overlayEl.appendChild(backdropEl);
      overlayEl.appendChild(panelEl);
      container.appendChild(overlayEl);

      // Clicking the backdrop closes the modal
      backdropEl.addEventListener('click', () => close());

      focusTrap = createFocusTrap(panelEl);
    },

    destroy(): void {
      if (isOpen) {
        focusTrap?.deactivate();
        if (escHandler) document.removeEventListener('keydown', escHandler);
      }
      banner.destroy();
      startZone.destroy();
      panels.destroy();
      overlayEl?.remove();
      overlayEl = null;
      panelEl = null;
      backdropEl = null;
      closeBtn = null;
      focusTrap = null;
      isOpen = false;
      isAnimating = false;
    },

    open(project: Project, bubble: HTMLElement, onDim: (dim: boolean) => void): void {
      if (isAnimating || !overlayEl || !panelEl) return;
      isAnimating = true;
      isOpen = false;
      originBubble = bubble;
      dimCallback = onDim;

      banner.update(project);
      startZone.update(project);
      panels.update(project);

      // Phase 1 (0–80ms): origin bubble scales up and fades slightly
      const bubbleInner = bubble.querySelector<HTMLElement>('.vita-bubble__inner');
      if (bubbleInner) {
        bubbleInner.style.transition =
          'transform 80ms ease-out, opacity 80ms ease-out';
        bubbleInner.style.transform = 'scale(1.2)';
        bubbleInner.style.opacity = '0.6';
      }

      // Phase 2 (60–180ms): overlay appears, panel scales in
      delay(60).then(() => {
        if (!overlayEl || !panelEl) return;

        overlayEl.hidden = false;
        overlayEl.removeAttribute('aria-hidden');
        overlayEl.tabIndex = -1;

        panelEl.style.transition = 'none';
        panelEl.style.opacity = '0';
        panelEl.style.transform = 'scale(0.92)';

        // Force reflow
        panelEl.getBoundingClientRect();

        panelEl.style.transition =
          `opacity 200ms var(--transition-vita-open, cubic-bezier(0.22, 1, 0.36, 1)),
           transform 280ms var(--transition-vita-open, cubic-bezier(0.22, 1, 0.36, 1))`;
        panelEl.style.opacity = '1';
        panelEl.style.transform = 'scale(1)';

        return delay(120);
      }).then(() => {
        // Phase 3 (180–280ms): grid dims, bubble returns to normal
        onDim(true);

        if (bubbleInner) {
          bubbleInner.style.transition = 'transform 120ms ease-out, opacity 120ms ease-out';
          bubbleInner.style.transform = '';
          bubbleInner.style.opacity = '';
        }

        return delay(100);
      }).then(() => {
        if (!overlayEl) return;
        isOpen = true;
        isAnimating = false;

        escHandler = handleEsc;
        document.addEventListener('keydown', escHandler);
        focusTrap?.activate();
      });
    },

    close,
  };
}
