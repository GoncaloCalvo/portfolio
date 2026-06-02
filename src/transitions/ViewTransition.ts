import { ViewState, ViewMode } from '../state/viewState';
import { delay } from '../utils/delay';

// Type extension for View Transition API (Chrome 111+, progressive enhancement)
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function manualTransitionToVita(): Promise<void> {
  const professionalRoot = document.getElementById('view-professional')!;
  const vitaRoot = document.getElementById('view-vita')!;

  // Phase 1 (0–120ms): Professional fades and blurs out
  professionalRoot.style.transition = 'opacity 120ms ease-out, filter 120ms ease-out';
  professionalRoot.style.opacity = '0';
  professionalRoot.style.filter = 'blur(8px)';

  await delay(80); // Vita starts before professional fully hides

  // Phase 2 (80–280ms): Vita scales in from slight underscale
  vitaRoot.style.display = 'block';
  vitaRoot.style.opacity = '0';
  vitaRoot.style.transform = 'scale(0.96)';
  vitaRoot.style.transition = 'none';

  // Force reflow so transition applies from the set initial state
  vitaRoot.getBoundingClientRect();

  vitaRoot.style.transition =
    'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
  vitaRoot.style.opacity = '1';
  vitaRoot.style.transform = 'scale(1)';

  await delay(200);

  // Phase 3 (280–360ms): Remove professional from DOM flow, commit state
  professionalRoot.style.display = 'none';
  professionalRoot.style.opacity = '';
  professionalRoot.style.filter = '';
  professionalRoot.style.transition = '';

  // Clear vita inline styles — CSS [data-view] rules take over from here
  vitaRoot.style.opacity = '';
  vitaRoot.style.transform = '';
  vitaRoot.style.transition = '';
  vitaRoot.style.display = '';

  ViewState.set('vita');
}

async function manualTransitionToProfessional(): Promise<void> {
  const professionalRoot = document.getElementById('view-professional')!;
  const vitaRoot = document.getElementById('view-vita')!;

  // Phase 1 (0–120ms): Vita fades and scales out
  vitaRoot.style.transition = 'opacity 120ms ease-out, transform 120ms ease-out';
  vitaRoot.style.opacity = '0';
  vitaRoot.style.transform = 'scale(0.96)';

  await delay(80);

  // Phase 2 (80–280ms): Professional fades in from blur
  professionalRoot.style.display = 'block';
  professionalRoot.style.opacity = '0';
  professionalRoot.style.filter = 'blur(8px)';
  professionalRoot.style.transition = 'none';

  professionalRoot.getBoundingClientRect();

  professionalRoot.style.transition =
    'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease-out';
  professionalRoot.style.opacity = '1';
  professionalRoot.style.filter = 'blur(0px)';

  await delay(200);

  // Phase 3: Remove vita from DOM flow, commit state
  vitaRoot.style.display = 'none';
  vitaRoot.style.opacity = '';
  vitaRoot.style.transform = '';
  vitaRoot.style.transition = '';

  professionalRoot.style.opacity = '';
  professionalRoot.style.filter = '';
  professionalRoot.style.transition = '';
  professionalRoot.style.display = '';

  ViewState.set('professional');
}

export async function performTransition(next: ViewMode): Promise<void> {
  // Reduced-motion: instant swap, no animation
  if (prefersReducedMotion()) {
    ViewState.set(next);
    return;
  }

  // Progressive enhancement: View Transition API (Chrome 111+)
  const doc = document as DocumentWithViewTransition;
  if (doc.startViewTransition) {
    doc.startViewTransition(() => ViewState.set(next));
    return;
  }

  // Manual CSS fallback for browsers without View Transition API
  if (next === 'vita') {
    await manualTransitionToVita();
  } else {
    await manualTransitionToProfessional();
  }
}
