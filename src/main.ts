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

const app = document.getElementById('app')!;
const proContainer = document.getElementById('view-professional')!;

// ViewToggle is persistent — mounted once, never destroyed
const viewToggle = createViewToggle();
viewToggle.mount(app);

let proView: ComponentInstance | null = null;

window.addEventListener('viewchange', (e) => {
  const { mode } = e.detail;

  if (mode === 'professional') {
    if (!proView) {
      proView = createProfessionalView();
      proView.mount(proContainer);
    }
  } else {
    if (proView) {
      proView.destroy();
      proView = null;
    }
  }
});

// Synchronizes the TypeScript state layer with the FOUC-set [data-view] attribute,
// then fires viewchange so the component lifecycle above runs on initial load.
ViewState.set(ViewState.get());
