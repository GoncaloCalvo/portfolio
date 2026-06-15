/**
 * peel.ts — PS Vita "peel" exit gesture for the LiveArea sheet.
 *
 * The LiveArea panel is treated as a sheet of paper. Grabbing the page tab in
 * the top-right corner (or dragging the sheet horizontally) lifts the corner and
 * peels the page away along the bottom-left diagonal, revealing the home screen
 * behind it. Pull past ~50% of the diagonal (or flick) and release to finish the
 * peel and close; release earlier and the page snaps back into place.
 *
 * Visual model (the simplified-but-convincing fold approved in the spec):
 *   - A diagonal crease sweeps from the top-right corner toward bottom-left.
 *   - Everything past the crease is removed from the panel via `clip-path`, so the
 *     home screen shows through the gap.
 *   - A folded-corner flap — the mirror image of the removed corner reflected back
 *     across the crease — is drawn on top with a paper gradient + drop shadow so it
 *     reads as the page curling over.
 *
 * Pointer Events + setPointerCapture are used throughout so mouse and touch behave
 * identically. Geometry uses a half-plane clip (Sutherland–Hodgman) so it is exact
 * for any panel size.
 */

type Pt = [number, number];

export interface PeelOptions {
  /** The LiveArea sheet element. Its clip-path is driven by the gesture. */
  panel: HTMLElement;
  /** The page-tab handle in the top-right corner. */
  handle: HTMLElement;
  /** The overlay the flap visual is appended to (sibling of the panel). */
  overlay: HTMLElement;
  /** Fired once when a peel gesture actually commits (after the move threshold). */
  onStart(): void;
  /** Fired continuously with progress 0..1 while dragging or animating. */
  onProgress(progress: number): void;
  /** Fired when the page snaps back (released below threshold). */
  onCancel(): void;
  /** Fired when the peel completes (released past threshold / flicked). */
  onComplete(): void;
}

export interface PeelController {
  /**
   * Show the resting dog-ear: a small permanent fold of the top-right corner.
   * Call once the panel's layout has settled (after the open animation) and on
   * resize so the fold stays pinned to the corner.
   */
  arm(): void;
  /** Clear all peel visuals (flat sheet, no fold). Call on open-start and close. */
  reset(): void;
  /** True while a drag or release animation is in flight. */
  isBusy(): boolean;
  /** Remove listeners and the flap element. */
  destroy(): void;
}

/** Target size (px) of the resting dog-ear's edge legs. */
const REST_FOLD_PX = 46;

/** Fraction of the diagonal that must be crossed for the peel to complete. */
const THRESHOLD = 0.5;
/** Movement (px) before a body drag commits to a peel. */
const START_THRESHOLD = 8;
/** Release velocity (px/ms along the peel axis) that completes regardless of threshold. */
const FLICK_VELOCITY = 1.1;
/** Minimum progress required for a flick to count as a completion. */
const FLICK_MIN_PROGRESS = 0.15;

const SQRT2 = Math.SQRT2;

export function createPeel(opts: PeelOptions): PeelController {
  const { panel, handle, overlay } = opts;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The curled-corner flap is a fixed-position sibling so the panel's own
  // clip-path (which removes the peeled region) never clips it.
  const flap = document.createElement('div');
  flap.className = 'vita-livearea-fold';
  flap.setAttribute('aria-hidden', 'true');
  overlay.appendChild(flap);

  // ── Gesture state ──
  let phase: 'idle' | 'pending' | 'active' | 'animating' = 'idle';
  let pointerId = -1;
  // When the gesture starts on the page tab, any drag direction peels (and never
  // scrolls). A body drag instead has to be horizontally dominant to commit.
  let viaHandle = false;
  let startX = 0;
  let startY = 0;
  let w = 0;
  let h = 0;
  let diag = 1;
  let rectLeft = 0;
  let rectTop = 0;
  let lastProgress = 0;
  let lastT = 0;
  let velocity = 0; // progress-axis px/ms
  let rafId = 0;
  // The resting fold the sheet returns to (0 when disarmed/closing). The drag
  // never renders below this, and a snap-back settles back to it.
  let restProgress = 0;

  // ── Geometry ──────────────────────────────────────────────────────────────

  /**
   * Clip the panel rectangle against the half-plane defined by the crease line
   * `y - x = d`. `keepPositive` selects which side of the crease to keep.
   * Returns the clipped polygon (the kept region) as panel-local points.
   */
  function clipHalfPlane(d: number, keepPositive: boolean): Pt[] {
    const corners: Pt[] = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    const sign = keepPositive ? 1 : -1;
    const f = (p: Pt): number => sign * (p[1] - p[0] - d);
    const out: Pt[] = [];
    for (let i = 0; i < corners.length; i++) {
      const cur = corners[i];
      const nxt = corners[(i + 1) % corners.length];
      const fc = f(cur);
      const fn = f(nxt);
      if (fc >= 0) out.push(cur);
      if ((fc >= 0) !== (fn >= 0)) {
        const t = fc / (fc - fn);
        out.push([cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])]);
      }
    }
    return out;
  }

  /** Reflect a point across the crease line `y - x = d`. Points on the crease map to themselves. */
  function reflect(p: Pt, d: number): Pt {
    return [p[1] - d, p[0] + d];
  }

  function toPolygon(pts: Pt[]): string {
    return `polygon(${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
  }

  /**
   * Render the sheet at a given peel progress (0 = at rest, 1 = fully peeled off).
   * Drives the panel clip-path, the folded-corner flap, and emits onProgress.
   */
  function render(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));

    if (p <= 0.001) {
      panel.style.clipPath = '';
      panel.style.setProperty('--peel', '0');
      flap.classList.remove('is-visible');
      opts.onProgress(0);
      return;
    }

    // Crease sweeps from the top-right corner (y - x = -w) to the
    // bottom-left corner (y - x = h) as progress goes 0 -> 1.
    const d = -w + p * (w + h);

    const kept = clipHalfPlane(d, true);
    panel.style.clipPath = kept.length >= 3 ? toPolygon(kept) : 'polygon(0 0, 0 0, 0 0)';
    panel.style.setProperty('--peel', p.toFixed(3));

    // The flap is the removed corner reflected back across the crease — the
    // underside of the page as it curls over.
    const removed = clipHalfPlane(d, false);
    if (removed.length >= 3 && p < 0.999) {
      const flapPoly = removed.map((pt) => reflect(pt, d));
      flap.style.clipPath = toPolygon(flapPoly);
      // Fade the flap out over the final stretch so the fully-peeled frame is clean.
      flap.style.opacity = p > 0.8 ? ((1 - p) / 0.2).toFixed(3) : '1';
      flap.classList.add('is-visible');
    } else {
      flap.classList.remove('is-visible');
    }

    opts.onProgress(p);
  }

  function positionFlap(): void {
    flap.style.left = `${rectLeft}px`;
    flap.style.top = `${rectTop}px`;
    flap.style.width = `${w}px`;
    flap.style.height = `${h}px`;
  }

  /** Measure the panel box and reposition the flap over it. */
  function measure(): void {
    const rect = panel.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    diag = Math.hypot(w, h) || 1;
    rectLeft = rect.left;
    rectTop = rect.top;
    positionFlap();
  }

  // ── Release animations ──────────────────────────────────────────────────────

  function tween(from: number, to: number, duration: number, ease: (t: number) => number, done: () => void): void {
    if (reducedMotion.matches || duration <= 0) {
      render(to);
      done();
      return;
    }
    const startT = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - startT) / duration);
      render(from + (to - from) * ease(t));
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        done();
      }
    };
    rafId = requestAnimationFrame(step);
  }

  // Accelerating curve — gives the finish a sense of momentum/weight.
  const easeIn = (t: number): number => t * t;
  // Ease-out with a slight overshoot — the springy snap-back.
  const easeOutBack = (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  function complete(fromProgress: number): void {
    phase = 'animating';
    // Peel fully away. The host hides the overlay in onComplete, then reset()
    // clears the clip — so we deliberately don't un-clip here (that would flash
    // the full sheet for a frame before it closes).
    tween(fromProgress, 1, 260, easeIn, () => {
      phase = 'idle';
      opts.onComplete();
    });
  }

  function cancel(fromProgress: number): void {
    phase = 'animating';
    opts.onCancel();
    // Snap back to the resting dog-ear (not flat) with a springy ease-out.
    tween(fromProgress, restProgress, 360, easeOutBack, () => {
      phase = 'idle';
    });
  }

  // ── Progress from pointer ───────────────────────────────────────────────────

  function progressFor(clientX: number, clientY: number): number {
    const dx = clientX - startX;
    const dy = clientY - startY;
    // Project the drag onto the bottom-left peel axis (-1, +1)/√2.
    const proj = (dy - dx) / SQRT2;
    return Math.max(0, Math.min(1, proj / diag));
  }

  // ── Pointer handlers ────────────────────────────────────────────────────────

  function beginTracking(e: PointerEvent): void {
    measure();
    startX = e.clientX;
    startY = e.clientY;
    pointerId = e.pointerId;
    lastProgress = 0;
    lastT = performance.now();
    velocity = 0;
  }

  function commit(): void {
    phase = 'active';
    // Always capture on the panel (it is never hidden); the handle may fade out
    // during the drag, which would implicitly release a capture held on it.
    try {
      panel.setPointerCapture(pointerId);
    } catch {
      /* pointer may already be gone — harmless */
    }
    opts.onStart();
  }

  function onHandleDown(e: PointerEvent): void {
    if (phase !== 'idle' || e.button !== 0) return;
    if (rafId) cancelAnimationFrame(rafId);
    e.preventDefault();
    e.stopPropagation();
    beginTracking(e);
    viaHandle = true;
    phase = 'pending';
  }

  function onPanelDown(e: PointerEvent): void {
    if (phase !== 'idle' || e.button !== 0) return;
    // Never start a peel from the interactive controls or the handle (handled above).
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, .vita-livearea-peel-handle')) {
      return;
    }
    if (rafId) cancelAnimationFrame(rafId);
    beginTracking(e);
    viaHandle = false;
    phase = 'pending';
  }

  function onMove(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;

    if (phase === 'pending') {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < START_THRESHOLD && Math.abs(dy) < START_THRESHOLD) return;
      const scrollable = panel.scrollHeight > panel.clientHeight + 2;
      // The page tab peels in any direction. A body drag commits only when it is
      // horizontally dominant (or the sheet can't scroll) — vertical drags on a
      // scrollable sheet stay scrolls.
      if (viaHandle || Math.abs(dx) >= Math.abs(dy) || !scrollable) {
        commit();
      } else {
        phase = 'idle';
        pointerId = -1;
        return;
      }
    }

    if (phase !== 'active') return;
    e.preventDefault();

    const progress = progressFor(e.clientX, e.clientY);
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) velocity = (progress - lastProgress) * diag / dt; // px/ms along peel axis
    lastProgress = progress;
    lastT = now;
    // Never render below the resting fold — small movements keep the dog-ear.
    render(Math.max(progress, restProgress));
  }

  function onUp(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    if (phase === 'pending') {
      phase = 'idle';
      pointerId = -1;
      return;
    }
    if (phase !== 'active') return;

    try {
      panel.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    pointerId = -1;
    phase = 'idle';

    const shouldComplete =
      lastProgress >= THRESHOLD ||
      (velocity > FLICK_VELOCITY && lastProgress > FLICK_MIN_PROGRESS);

    const current = Math.max(lastProgress, restProgress);
    if (shouldComplete) {
      complete(current);
    } else {
      cancel(current);
    }
  }

  function onCancelEvent(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    // Treat an interrupted gesture as a snap-back.
    if (phase === 'active') {
      const current = Math.max(lastProgress, restProgress);
      pointerId = -1;
      phase = 'idle';
      cancel(current);
    } else {
      phase = 'idle';
      pointerId = -1;
    }
  }

  handle.addEventListener('pointerdown', onHandleDown);
  panel.addEventListener('pointerdown', onPanelDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancelEvent);

  return {
    arm(): void {
      if (phase === 'active' || phase === 'animating') return;
      measure();
      restProgress = w > 0 ? Math.min(0.08, REST_FOLD_PX / (w + h)) : 0;
      render(restProgress);
    },

    reset(): void {
      if (rafId) cancelAnimationFrame(rafId);
      phase = 'idle';
      pointerId = -1;
      restProgress = 0;
      panel.style.clipPath = '';
      panel.style.setProperty('--peel', '0');
      flap.classList.remove('is-visible');
      flap.style.opacity = '1';
    },

    isBusy(): boolean {
      return phase === 'active' || phase === 'animating';
    },

    destroy(): void {
      if (rafId) cancelAnimationFrame(rafId);
      handle.removeEventListener('pointerdown', onHandleDown);
      panel.removeEventListener('pointerdown', onPanelDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancelEvent);
      flap.remove();
    },
  };
}
