import './BubbleGrid.css';
import type { Project, ProjectCatalog } from '../../../types/project';
import { createBubble } from './Bubble';
import type { ComponentInstance as BubbleInstance } from './Bubble';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
  dim(isDimmed: boolean): void;
}

export interface BubbleGridCallbacks {
  onBubbleClick(project: Project, bubbleEl: HTMLElement): void;
}

const BUBBLES_PER_PAGE = 8;

export function createBubbleGrid(
  catalog: ProjectCatalog,
  callbacks: BubbleGridCallbacks
): ComponentInstance {
  let scrollContainer: HTMLElement | null = null;
  const bubbleInstances: BubbleInstance[] = [];

  return {
    mount(container: HTMLElement): void {
      scrollContainer = document.createElement('div');
      scrollContainer.className = 'vita-scroll-container';
      scrollContainer.setAttribute('data-scroll-container', '');

      const pageCount = Math.ceil(catalog.length / BUBBLES_PER_PAGE);

      for (let p = 0; p < pageCount; p++) {
        const page = document.createElement('section');
        page.className = 'vita-screen-page';
        page.dataset.page = String(p);

        const pageLabel = pageCount > 1
          ? `Projects, page ${p + 1} of ${pageCount}`
          : 'Project bubbles';

        const grid = document.createElement('div');
        grid.className = 'vita-bubble-grid';
        grid.setAttribute('role', 'list');
        grid.setAttribute('aria-label', pageLabel);

        const slice = catalog.slice(p * BUBBLES_PER_PAGE, (p + 1) * BUBBLES_PER_PAGE);
        slice.forEach((project, localIdx) => {
          const globalIdx = p * BUBBLES_PER_PAGE + localIdx;
          const bubble = createBubble(project, globalIdx, {
            onClick: callbacks.onBubbleClick,
          });
          bubble.mount(grid);
          bubbleInstances.push(bubble);
        });

        page.appendChild(grid);
        scrollContainer.appendChild(page);
      }

      container.appendChild(scrollContainer);
    },

    destroy(): void {
      bubbleInstances.forEach(b => b.destroy());
      bubbleInstances.length = 0;
      scrollContainer?.remove();
      scrollContainer = null;
    },

    dim(isDimmed: boolean): void {
      const grids = scrollContainer?.querySelectorAll<HTMLElement>('.vita-bubble-grid');
      grids?.forEach(grid => {
        grid.classList.toggle('vita-bubble-grid--dimmed', isDimmed);
        grid.style.opacity = isDimmed ? '0.3' : '';
        grid.style.transition = 'opacity 200ms ease-out';
      });
    },
  };
}
