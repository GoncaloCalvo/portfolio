import './styles/global.css';
import './styles/fonts.css';
import './styles/professional/variables.css';
import './styles/vita/variables.css';

import { ViewState, type ViewMode } from './state/viewState';
import { createViewToggle } from './components/shared/ViewToggle/ViewToggle';
import {
  createProfessionalView,
  type ComponentInstance,
} from './components/professional/ProfessionalView';
import { createVitaView } from './components/vita/VitaView';

const app = document.getElementById('app')!;
const proContainer = document.getElementById('view-professional')!;
const vitaContainer = document.getElementById('view-vita')!;
const skipLink = document.getElementById('skip-link') as HTMLAnchorElement | null;

function syncSkipLink(mode: string): void {
  if (!skipLink) return;
  skipLink.href = mode === 'vita' ? '#vita-main-content' : '#main-content';
}

// Move the toggle button between its two mount targets without recreating it:
// – professional: appended to #pro-nav as a flex child (no fixed positioning needed)
// – vita / fallback: appended to #app where CSS applies position: fixed top-right
// Called BEFORE proView.destroy() when leaving professional so the button is never
// inside a nav that's about to be removed from the DOM.
function reparentToggle(mode: ViewMode): void {
  const btn = document.getElementById('view-toggle-btn');
  if (!btn) return;
  if (mode === 'professional') {
    const navEl = document.getElementById('pro-nav');
    if (navEl && btn.parentElement !== navEl) navEl.appendChild(btn);
  } else {
    if (btn.parentElement !== app) app.appendChild(btn);
  }
}

// ViewToggle mounts to #app on startup; reparentToggle moves it into #pro-nav
// once the professional view (and its nav) are present in the DOM.
const viewToggle = createViewToggle();
viewToggle.mount(app);

let proView: ComponentInstance | null = null;
let vitaView: ComponentInstance | null = null;

window.addEventListener('viewchange', (e) => {
  const { mode } = (e as CustomEvent<{ mode: ViewMode }>).detail;

  syncSkipLink(mode);

  if (mode === 'professional') {
    if (vitaView) {
      vitaView.destroy();
      vitaView = null;
    }
    if (!proView) {
      proView = createProfessionalView();
      proView.mount(proContainer);
    }
    // Nav is now in the DOM — move toggle into it
    reparentToggle('professional');
  } else {
    // Rescue the toggle from #pro-nav before the nav is destroyed
    reparentToggle('vita');
    if (proView) {
      proView.destroy();
      proView = null;
    }
    if (!vitaView) {
      vitaView = createVitaView();
      vitaView.mount(vitaContainer);
    }
  }
});

// Synchronises the TypeScript state layer with the FOUC-set [data-view] attribute,
// then fires viewchange so the component lifecycle above runs on initial load.
ViewState.set(ViewState.get());
