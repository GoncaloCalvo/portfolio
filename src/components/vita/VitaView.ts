import type { ProjectCatalog } from '../../types/project';
import projectsData from '../../data/projects.json';
import { createVitaBackground } from './Background/VitaBackground';
import { createBubbleGrid } from './BubbleGrid/BubbleGrid';
import { createPageIndicator } from './PageIndicator/PageIndicator';
import { createLiveArea } from './LiveArea/LiveArea';
import { createAudioToggle } from './AudioToggle/AudioToggle';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

const BUBBLES_PER_PAGE = 8;

export function createVitaView(): ComponentInstance {
  const catalog = (projectsData as ProjectCatalog).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  const background = createVitaBackground();
  const liveArea = createLiveArea();
  const audioToggle = createAudioToggle();

  let bubbleGrid: ReturnType<typeof createBubbleGrid> | null = null;
  let pageIndicator: ReturnType<typeof createPageIndicator> | null = null;
  let mainEl: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      // Fixed background layer (position: fixed — lives at container level)
      background.mount(container);

      // <main> landmark wraps the primary interactive bubble grid content.
      // Fixed-position overlays (pageIndicator, liveArea, audioToggle) stay at
      // container level since they appear at fixed viewport positions.
      mainEl = document.createElement('main');
      mainEl.className = 'vita-main';
      mainEl.id = 'vita-main-content';
      mainEl.setAttribute('aria-label', 'Interactive project portfolio');
      container.appendChild(mainEl);

      // Build bubble grid, which creates the scroll container + page DOM
      bubbleGrid = createBubbleGrid(catalog, {
        onBubbleClick(project, bubbleEl) {
          liveArea.open(project, bubbleEl, (dim) => {
            bubbleGrid?.dim(dim);
          });
        },
      });
      bubbleGrid.mount(mainEl);

      // Page indicator queries the scroll container from the full container tree
      const scrollEl = container.querySelector<HTMLElement>('.vita-scroll-container');
      const pageCount = Math.ceil(catalog.length / BUBBLES_PER_PAGE);

      if (scrollEl && pageCount > 1) {
        pageIndicator = createPageIndicator(pageCount, scrollEl);
        pageIndicator.mount(container);
      }

      // LiveArea is always in the DOM but hidden until a bubble opens it
      liveArea.mount(container);

      // Audio toggle — bottom-right corner
      audioToggle.mount(container);
    },

    destroy(): void {
      liveArea.close();
      audioToggle.destroy();
      liveArea.destroy();
      pageIndicator?.destroy();
      pageIndicator = null;
      bubbleGrid?.destroy();
      bubbleGrid = null;
      mainEl?.remove();
      mainEl = null;
      background.destroy();
    },
  };
}
