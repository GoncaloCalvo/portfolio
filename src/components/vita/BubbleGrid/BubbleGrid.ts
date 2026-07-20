import './BubbleGrid.css';
import type { Project, ProjectCatalog } from '../../../types/project';
import { createBubble } from './Bubble';
import type { BubbleInstance } from './Bubble';
import type { ComponentInstance } from '../../../types/component';

export interface GridInstance extends ComponentInstance {
  dim(isDimmed: boolean): void;
}

export interface BubbleGridCallbacks {
  onBubbleClick(project: Project, bubbleEl: HTMLElement): void;
}

/** Staggered XMB row rhythm: 2 bubbles, 3 nested below, 2 again. */
const ROW_PATTERN = [2, 3, 2];

/** One full page holds exactly one 2/3/2 block. */
export const BUBBLES_PER_PAGE = ROW_PATTERN.reduce((a, b) => a + b, 0);

/** Half-width grid columns per row. A bubble occupies two of them. */
const HALF_COLUMNS = 6;

/**
 * Splits a page's bubbles into staggered rows. The 6-column track is centred
 * on the page as a whole (CSS justify-content), but within it a 3-row lands on
 * half-columns 1/3/5 and a 2-row on 2/4, nesting into the gaps above it. The
 * start column is fixed by the row's pattern capacity, not its actual fill, so
 * a partial row fills from the left slot rather than being re-centred — e.g.
 * the 6th of six bubbles sits under the left bubble of the 2-row above, not the
 * middle.
 */
function getBubblePlacements(count: number): Array<{ row: number; column: number }> {
  const placements: Array<{ row: number; column: number }> = [];
  let placed = 0;
  let row = 0;

  while (placed < count) {
    const capacity = ROW_PATTERN[row % ROW_PATTERN.length];
    const inRow = Math.min(capacity, count - placed);
    // A 3-capacity row starts flush left (col 1); a 2-capacity row is inset
    // by one half-column (col 2) so it nests between the bubbles above.
    const startColumn = 1 + (HALF_COLUMNS - capacity * 2) / 2;

    for (let i = 0; i < inRow; i++) {
      placements.push({ row: row + 1, column: startColumn + i * 2 });
    }

    placed += inRow;
    row += 1;
  }

  return placements;
}

export function createBubbleGrid(
  catalog: ProjectCatalog,
  callbacks: BubbleGridCallbacks
): GridInstance {
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
        const placements = getBubblePlacements(slice.length);

        slice.forEach((project, localIdx) => {
          const globalIdx = p * BUBBLES_PER_PAGE + localIdx;
          const bubble = createBubble(project, globalIdx, {
            onClick: callbacks.onBubbleClick,
          });
          bubble.mount(grid);

          const el = bubble.getElement();
          const { row, column } = placements[localIdx];
          if (el) {
            el.style.gridRow = String(row);
            el.style.gridColumn = `${column} / span 2`;
          }

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
