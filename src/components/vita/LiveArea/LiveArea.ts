import './LiveArea.css';
import type { Project } from '../../../types/project';
import { createLiveAreaBanner } from './LiveAreaBanner';
import { createLiveAreaStartZone } from './LiveAreaStartZone';
import { createLiveAreaPanels } from './LiveAreaPanels';
import { createFocusTrap } from '../../../utils/focusTrap';
import { delay } from '../../../utils/delay';
import { audioManager } from '../../../state/audioState';
import { createPeel } from './peel';
import type { PeelController } from './peel';

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
  let peelHandle: HTMLElement | null = null;
  let peel: PeelController | null = null;
  let originBubble: HTMLElement | null = null;
  let dimCallback: ((dim: boolean) => void) | null = null;
  let isOpen = false;
  let isAnimating = false;

  /** Peel threshold mirror of peel.ts — used to map progress onto backdrop opacity. */
  const PEEL_THRESHOLD = 0.5;

  const banner = createLiveAreaBanner();
  const startZone = createLiveAreaStartZone();
  const panels = createLiveAreaPanels();

  let focusTrap: ReturnType<typeof createFocusTrap> | null = null;
  let escHandler: ((e: KeyboardEvent) => void) | null = null;
  let resizeHandler: (() => void) | null = null;

  /** Pin the peel handle over the panel's top-right corner (above its scrollbar). */
  function positionHandle(): void {
    if (!peelHandle || !panelEl) return;
    const r = panelEl.getBoundingClientRect();
    const size = peelHandle.offsetWidth || 52;
    peelHandle.style.left = `${r.right - size}px`;
    peelHandle.style.top = `${r.top}px`;
  }

  function handleEsc(e: KeyboardEvent): void {
    if (e.key === 'Escape' && isOpen) close();
  }

  /**
   * Tear the LiveArea down to the closed state once a close/peel animation has
   * finished. Shared by the button/Esc close path and the peel-completion path.
   */
  function finalize(): void {
    if (!overlayEl) return;
    overlayEl.hidden = true;
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.removeAttribute('tabindex');

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }

    // Restore resting visuals for next open.
    if (peelHandle) peelHandle.style.pointerEvents = 'none';
    if (backdropEl) backdropEl.style.opacity = '';
    if (panelEl) {
      panelEl.style.transition = '';
      panelEl.style.opacity = '';
      panelEl.style.transform = '';
    }
    peel?.reset();

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
  }

  function close(): void {
    if (!isOpen || isAnimating || peel?.isBusy() || !overlayEl || !panelEl) return;
    isOpen = false;
    isAnimating = true;

    audioManager.play('liveareaClose');
    focusTrap?.deactivate();
    if (escHandler) document.removeEventListener('keydown', escHandler);

    // Clear the dog-ear immediately so it folds away with the panel instead of
    // lingering pinned at the corner while the sheet scales/fades out.
    peel?.reset();
    if (peelHandle) peelHandle.style.pointerEvents = 'none';

    panelEl.style.transition =
      'opacity 200ms ease-in, transform 200ms ease-in';
    panelEl.style.opacity = '0';
    panelEl.style.transform = 'scale(0.94)';

    delay(200).then(finalize);
  }

  /** Called by the peel controller when the page is peeled fully off-screen. */
  function onPeelComplete(): void {
    if (!isOpen) return;
    isOpen = false;
    isAnimating = true;
    audioManager.play('liveareaClose');
    focusTrap?.deactivate();
    if (escHandler) document.removeEventListener('keydown', escHandler);
    finalize();
  }

  /** Map peel progress onto the backdrop veil so the home screen reads through. */
  function onPeelProgress(progress: number): void {
    if (!backdropEl) return;
    const reveal = Math.min(progress / PEEL_THRESHOLD, 1);
    backdropEl.style.opacity = String(1 - reveal * 0.9);
  }

  /** Peel committed — brighten the home screen behind the lifting sheet. */
  function onPeelStart(): void {
    dimCallback?.(false);
  }

  /** Peel released below threshold — restore the resting overlay state. */
  function onPeelCancel(): void {
    dimCallback?.(true);
    if (backdropEl) {
      backdropEl.style.transition = 'opacity 200ms ease-out';
      backdropEl.style.opacity = '';
      delay(220).then(() => {
        if (backdropEl) backdropEl.style.transition = '';
      });
    }
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

      // Page-tab peel handle (top-right corner). Decorative — keyboard/AT users
      // close via Escape or the close button; the peel is a pointer enhancement.
      // Appended to the overlay (not the panel) so it layers above the panel's
      // scrollbar and stays pinned to the sheet corner — positioned in open().
      peelHandle = document.createElement('div');
      peelHandle.className = 'vita-livearea-peel-handle';
      peelHandle.setAttribute('aria-hidden', 'true');
      peelHandle.title = 'Drag to peel away';
      // Transparent hit target; the visible dog-ear is drawn by the peel
      // controller (panel clip + fold flap). Disabled until positioned.
      peelHandle.style.pointerEvents = 'none';

      overlayEl.appendChild(backdropEl);
      overlayEl.appendChild(panelEl);
      overlayEl.appendChild(peelHandle);
      container.appendChild(overlayEl);

      // Clicking the backdrop closes the modal
      backdropEl.addEventListener('click', () => close());

      focusTrap = createFocusTrap(panelEl);

      peel = createPeel({
        panel: panelEl,
        handle: peelHandle,
        overlay: overlayEl,
        onStart: onPeelStart,
        onProgress: onPeelProgress,
        onCancel: onPeelCancel,
        onComplete: onPeelComplete,
      });
    },

    destroy(): void {
      if (isOpen) {
        focusTrap?.deactivate();
        if (escHandler) document.removeEventListener('keydown', escHandler);
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }
      peel?.destroy();
      banner.destroy();
      startZone.destroy();
      panels.destroy();
      overlayEl?.remove();
      overlayEl = null;
      panelEl = null;
      backdropEl = null;
      closeBtn = null;
      peelHandle = null;
      peel = null;
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

      // Clear any leftover peel visuals from a prior interaction.
      peel?.reset();
      if (backdropEl) {
        backdropEl.style.transition = '';
        backdropEl.style.opacity = '';
      }

      audioManager.play('liveareaOpen');

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

        // Panel layout is now settled (transform back to scale(1)) — pin the
        // peel handle to the corner, show the resting dog-ear, and keep both
        // pinned on resize.
        positionHandle();
        peel?.arm();
        if (peelHandle) peelHandle.style.pointerEvents = 'auto';
        resizeHandler = () => {
          positionHandle();
          peel?.arm();
        };
        window.addEventListener('resize', resizeHandler);

        escHandler = handleEsc;
        document.addEventListener('keydown', escHandler);
        focusTrap?.activate();
      });
    },

    close,
  };
}
