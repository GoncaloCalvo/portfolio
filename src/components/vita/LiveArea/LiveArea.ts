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
  /** The origin bubble's inner circle, hidden while its launch clone is in flight. */
  let hiddenBubbleInner: HTMLElement | null = null;
  /** Transient fixed-position clone of the bubble icon that flies to centre on open. */
  let launchCloneEl: HTMLElement | null = null;
  let dimCallback: ((dim: boolean) => void) | null = null;
  let isOpen = false;
  let isAnimating = false;

  /** Peel threshold mirror of peel.ts — used to map progress onto backdrop opacity. */
  const PEEL_THRESHOLD = 0.5;

  /** PS Vita launch animation timings. */
  const FLIGHT_MS = 800;      // tap depress + tumbling flight to centre + landing pop
  const BLOOM_MS = 240;       // LiveArea panel blooms out of the landed icon
  const BLOOM_LEAD_MS = 120;  // bloom starts this early so flight/bloom overlap

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Remove the in-flight launch clone if present. */
  function removeLaunchClone(): void {
    launchCloneEl?.remove();
    launchCloneEl = null;
  }

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

  /** Pin the close button to the panel's top-left corner so it never scrolls away. */
  function positionCloseBtn(): void {
    if (!closeBtn || !panelEl) return;
    const r = panelEl.getBoundingClientRect();
    closeBtn.style.left = `${r.left + 12}px`;
    closeBtn.style.top = `${r.top + 12}px`;
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

    // Any leftover launch clone from the open sequence must not linger.
    removeLaunchClone();
    // Restore the origin bubble we hid during the launch flight.
    if (hiddenBubbleInner) {
      hiddenBubbleInner.style.opacity = '';
      hiddenBubbleInner = null;
    }

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }

    // Restore resting visuals for next open.
    if (peelHandle) peelHandle.style.pointerEvents = 'none';
    if (closeBtn) {
      closeBtn.style.opacity = '0';
      closeBtn.style.pointerEvents = 'none';
    }
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
    // Fade the close button out in step with the panel (it's a fixed sibling, so
    // it won't inherit the panel's opacity animation).
    if (closeBtn) {
      closeBtn.style.opacity = '0';
      closeBtn.style.pointerEvents = 'none';
    }

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
      // Fixed sibling of the panel (pinned in JS via positionCloseBtn) so it stays
      // put while the panel scrolls. Hidden until the panel settles after open.
      closeBtn.style.opacity = '0';
      closeBtn.style.pointerEvents = 'none';

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
      overlayEl.appendChild(closeBtn);
      overlayEl.appendChild(peelHandle);
      container.appendChild(overlayEl);

      // Clicking the backdrop closes the modal
      backdropEl.addEventListener('click', () => close());

      // Trap focus over the whole overlay: the close button is a sibling of the
      // panel (not a child), so a panel-scoped trap would leave it unreachable.
      // The backdrop and aria-hidden peel handle aren't focusable.
      focusTrap = createFocusTrap(overlayEl);

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
      removeLaunchClone();
      hiddenBubbleInner = null;
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

      // Clear any leftover visuals from a prior interaction.
      peel?.reset();
      removeLaunchClone();

      audioManager.play('liveareaOpen');

      banner.update(project);
      startZone.update(project);
      panels.update(project);

      const reduced = prefersReducedMotion();
      const bubbleInner = bubble.querySelector<HTMLElement>('.vita-bubble__inner');

      // Reveal the overlay up front (panel/backdrop start invisible, revealed by
      // the sequence below) so the flying icon has a darkening stage to cross.
      overlayEl.hidden = false;
      overlayEl.removeAttribute('aria-hidden');
      overlayEl.tabIndex = -1;

      // Backdrop fades in over the flight so the home screen darkens as the icon travels.
      if (backdropEl) {
        backdropEl.style.transition = 'none';
        backdropEl.style.opacity = '0';
        backdropEl.getBoundingClientRect();
        backdropEl.style.transition = `opacity ${reduced ? 0 : FLIGHT_MS}ms ease-out`;
        backdropEl.style.opacity = '1';
      }

      // Panel waits, scaled down at centre, until the icon lands and it blooms.
      panelEl.style.transition = 'none';
      panelEl.style.opacity = '0';
      panelEl.style.transform = reduced ? 'scale(1)' : 'scale(0.4)';
      panelEl.getBoundingClientRect();

      // Bloom the LiveArea panel out of the landed icon, crossfading the clone away.
      const bloom = (): void => {
        if (panelEl) {
          panelEl.style.transition =
            `opacity ${BLOOM_MS}ms var(--transition-vita-open, cubic-bezier(0.22, 1, 0.36, 1)),
             transform ${BLOOM_MS + 40}ms var(--transition-vita-open, cubic-bezier(0.22, 1, 0.36, 1))`;
          panelEl.style.opacity = '1';
          panelEl.style.transform = 'scale(1)';
        }
        if (launchCloneEl) {
          launchCloneEl.style.transition = 'opacity 160ms ease-out';
          launchCloneEl.style.opacity = '0';
        }
      };

      // Settle into the resting open state: pin chrome, arm the peel, trap focus.
      const settle = (): void => {
        removeLaunchClone();
        if (!overlayEl) return;
        isOpen = true;
        isAnimating = false;
        onDim(true);

        positionHandle();
        positionCloseBtn();
        peel?.arm();
        if (peelHandle) peelHandle.style.pointerEvents = 'auto';
        if (closeBtn) {
          closeBtn.style.opacity = '1';
          closeBtn.style.pointerEvents = 'auto';
        }
        resizeHandler = () => {
          positionHandle();
          positionCloseBtn();
          peel?.arm();
        };
        window.addEventListener('resize', resizeHandler);

        escHandler = handleEsc;
        document.addEventListener('keydown', escHandler);
        focusTrap?.activate();
      };

      // Reduced motion (or no icon to fly): skip the flight, just bloom the panel.
      if (reduced || !bubbleInner) {
        bloom();
        delay(BLOOM_MS + 60).then(settle);
        return;
      }

      // ── Launch flight: clone the icon, hide the original, fly the clone to
      // the centre of the viewport. Vita-style: tap depress, lift-off with a
      // small 3D bank in the direction of travel, rotation correcting back to
      // face the user on approach, then an overshoot pop before settling. ──
      const r = bubbleInner.getBoundingClientRect();

      // Clone BEFORE hiding the original — cloneNode copies inline styles, so
      // cloning after `opacity = '0'` would produce an invisible flight.
      const clone = bubbleInner.cloneNode(true) as HTMLElement;
      clone.classList.add('vita-launch-clone');
      clone.setAttribute('aria-hidden', 'true');
      Object.assign(clone.style, {
        position: 'fixed',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        margin: '0',
        opacity: '1',
        // Inside the overlay, above the backdrop (which has a backdrop-filter and
        // would otherwise paint over a clone in a different stacking context) and
        // above the panel (z-index 1) so the clone crossfades on top of the bloom.
        zIndex: '600',
        pointerEvents: 'none',
        animation: 'none',        // stop the inherited float
        transition: 'none',
        willChange: 'transform, opacity, filter',
      });
      const cloneGlow = clone.querySelector<HTMLElement>('.vita-bubble__glow');
      if (cloneGlow) cloneGlow.style.animation = 'none';
      overlayEl.appendChild(clone);
      launchCloneEl = clone;

      hiddenBubbleInner = bubbleInner;
      bubbleInner.style.transition = 'none';
      bubbleInner.style.opacity = '0';

      // Translate the clone's centre to the viewport centre.
      const dx = window.innerWidth / 2 - (r.left + r.width / 2);
      const dy = window.innerHeight / 2 - (r.top + r.height / 2);

      // Bank a few degrees around Y (and a touch around X) in the direction of
      // travel, proportional to how far the bubble sits from centre. Kept small
      // (≤12°/≤8°) — with the moving highlight it reads as a sphere in 3D space.
      // ── Vita-style 3D somersault with real volume. A sphere's silhouette
      // never flattens when it rolls — only its surface texture moves — so the
      // tumble is split across layers instead of rotating the whole element
      // (which reads as a flat card):
      //   shell (this clone): circular silhouette + gloss, stays face-on, only
      //     banks a few degrees toward the travel direction;
      //   icon (img inside):  full 360° flip with backface hidden, so the
      //     artwork wraps around the ball and vanishes behind the limb instead
      //     of showing mirrored art;
      //   shade (overlay):    darkens mid-flip, reading as the unlit far side
      //     of the sphere while the fixed gloss stays toward the light. ──
      const dist = Math.hypot(dx, dy);
      const axisX = dist > 1 ? -dy / dist : 0;
      const axisY = dist > 1 ? dx / dist : 1;
      const axis = `${axisX.toFixed(4)}, ${axisY.toFixed(4)}, 0`;
      // Slight parabolic hop so the flight arcs instead of tracking a straight line.
      const hop = Math.min(64, dist * 0.12);
      const BANK_DEG = 26; // shell bank at mid-flight: dimensional, never edge-on

      // Far-side shading layer, painted above the icon, removed with the clone.
      const shade = document.createElement('div');
      shade.setAttribute('aria-hidden', 'true');
      Object.assign(shade.style, {
        position: 'absolute',
        inset: '0',
        borderRadius: '50%',
        pointerEvents: 'none',
        // Full spherical shading (lit top-left, falling to deep blue) so the
        // ball keeps a solid body while the icon is behind it, instead of
        // reading as a hollow glass ring.
        background:
          'radial-gradient(circle at 35% 30%, rgba(120, 170, 235, 0.5) 0%, ' +
          'rgba(35, 70, 130, 0.75) 40%, rgba(8, 18, 42, 0.92) 75%)',
        opacity: '0',
      });
      clone.appendChild(shade);

      const shellAt = (x: number, y: number, bank: number, s: number): string =>
        `perspective(900px) translate(${x}px, ${y}px) ` +
        `rotate3d(${axis}, ${bank}deg) scale(${s})`;

      clone.animate(
        [
          // Tap: bubble depresses slightly, highlight dims as the surface deforms.
          { offset: 0, transform: shellAt(0, 0, 0, 1), filter: 'brightness(1)',
            easing: 'ease-in' },
          { offset: 0.12, transform: shellAt(0, 2, 0, 0.92), filter: 'brightness(0.94)',
            easing: 'cubic-bezier(0.3, 0, 0.25, 1)' },
          // Lift-off: arcs up, banking toward the travel direction.
          { offset: 0.5, transform: shellAt(dx * 0.5, dy * 0.5 - hop, BANK_DEG, 1.5),
            filter: 'brightness(1.12)', easing: 'cubic-bezier(0.25, 0, 0.3, 1)' },
          // Landing: bank corrects back toward the user, slight size overshoot.
          { offset: 0.85, transform: shellAt(dx, dy, BANK_DEG * 0.12, 2.22),
            filter: 'brightness(1.04)', easing: 'ease-out' },
          // Settle: facing the user at final size.
          { offset: 1, transform: shellAt(dx, dy, 0, 2.05), filter: 'brightness(1)' },
        ],
        { duration: FLIGHT_MS, fill: 'forwards' }
      );

      // The icon tumbles several full turns inside the face-on shell (the
      // original Sony launch whips through multiple revolutions). Backface
      // hidden: whenever the artwork faces away it is behind the ball, leaving
      // the glassy shell + shading, then it wraps back around — always landing
      // exactly upright because the total is a whole number of turns.
      const SPIN_TURNS = 5;
      const spinEnd = SPIN_TURNS * 360;
      const iconEl = clone.querySelector<HTMLElement>('img');
      if (iconEl) {
        iconEl.style.backfaceVisibility = 'hidden';
        iconEl.style.willChange = 'transform';
        const iconAt = (ang: number): string =>
          `perspective(520px) rotate3d(${axis}, ${ang}deg)`;
        iconEl.animate(
          [
            { offset: 0, transform: iconAt(0), easing: 'ease-in' },
            { offset: 0.12, transform: iconAt(0),
              easing: 'cubic-bezier(0.3, 0, 0.25, 1)' },
            { offset: 0.5, transform: iconAt(spinEnd * 0.5),
              easing: 'cubic-bezier(0.25, 0, 0.3, 1)' },
            { offset: 0.85, transform: iconAt(spinEnd), easing: 'ease-out' },
            { offset: 1, transform: iconAt(spinEnd) },
          ],
          { duration: FLIGHT_MS, fill: 'forwards' }
        );
      }

      // Dark side of the sphere: deepest while the icon faces away.
      shade.animate(
        [
          { offset: 0, opacity: 0, easing: 'ease-in' },
          { offset: 0.12, opacity: 0.05 },
          { offset: 0.32, opacity: 0.8 },   // icon slips behind the limb
          { offset: 0.5, opacity: 0.95 },   // fully turned away — solid ball
          { offset: 0.68, opacity: 0.7 },   // wrapping back around
          { offset: 0.85, opacity: 0.08, easing: 'ease-out' },
          { offset: 1, opacity: 0 },
        ],
        { duration: FLIGHT_MS, fill: 'forwards' }
      );

      // Overlap the panel bloom with the tail of the flight for a seamless handoff.
      delay(FLIGHT_MS - BLOOM_LEAD_MS).then(bloom);
      delay(FLIGHT_MS + BLOOM_MS - BLOOM_LEAD_MS).then(settle);
    },

    close,
  };
}
