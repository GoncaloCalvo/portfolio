import './styles/global.css';
import './styles/fonts.css';
import './styles/professional/variables.css';
import './styles/vita/variables.css';

import { ViewState } from './state/viewState';
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

// ViewToggle is persistent — mounted once, never destroyed
const viewToggle = createViewToggle();
viewToggle.mount(app);

let proView: ComponentInstance | null = null;
let vitaView: ComponentInstance | null = null;

window.addEventListener('viewchange', (e) => {
  const { mode } = (e as CustomEvent<{ mode: string }>).detail;

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
  } else {
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

// Synchronizes the TypeScript state layer with the FOUC-set [data-view] attribute,
// then fires viewchange so the component lifecycle above runs on initial load.
ViewState.set(ViewState.get());
