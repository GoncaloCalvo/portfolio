import './styles/global.css';
import './styles/fonts.css';
import './styles/professional/variables.css';
import './styles/vita/variables.css';

import { ViewState, ViewMode } from './state/viewState';
import { createViewToggle } from './components/shared/ViewToggle/ViewToggle';

// Mount persistent ViewToggle first so it is ready to handle the initial viewchange event.
const app = document.getElementById('app')!;
const viewToggle = createViewToggle();
viewToggle.mount(app);

// Fire initial viewchange so all mounted components can synchronize to persisted state.
// The FOUC inline script already set [data-view] before JS loaded — this call confirms
// the TypeScript state layer is aligned and broadcasts to any listeners.
ViewState.set(ViewState.get());

// Core viewchange gateway — Phase 3+ will mount and destroy view-specific components here.
window.addEventListener('viewchange', (_e: CustomEvent<{ mode: ViewMode }>) => {
  // Placeholder: professional / vita root component lifecycle will be managed here
  // once ProfessionalView and VitaView components are implemented.
});
