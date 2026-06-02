export type ViewMode = 'professional' | 'vita';

const VIEW_STATE_KEY = 'portfolio_view_mode';
const DEFAULT_VIEW: ViewMode = 'professional';

export const ViewState = {
  get(): ViewMode {
    const stored = localStorage.getItem(VIEW_STATE_KEY) as ViewMode | null;
    return stored === 'vita' ? 'vita' : DEFAULT_VIEW;
  },

  set(mode: ViewMode): void {
    localStorage.setItem(VIEW_STATE_KEY, mode);
    document.documentElement.setAttribute('data-view', mode);
    window.dispatchEvent(new CustomEvent('viewchange', { detail: { mode } }));
  },

  toggle(): ViewMode {
    const next: ViewMode = ViewState.get() === 'professional' ? 'vita' : 'professional';
    ViewState.set(next);
    return next;
  },
};
