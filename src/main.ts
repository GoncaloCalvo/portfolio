import './styles/global.css';
import './styles/fonts.css';
import './styles/professional/variables.css';
import './styles/vita/variables.css';
import { ViewState } from './state/viewState';

// Sync the data-view attribute with persisted state.
// The inline FOUC script in index.html already set the attribute synchronously,
// but this call confirms the TypeScript state layer is aligned and fires the
// 'viewchange' event so any already-mounted components can initialize correctly.
ViewState.set(ViewState.get());
