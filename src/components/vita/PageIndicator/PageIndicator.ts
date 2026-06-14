import './PageIndicator.css';
import type { ComponentInstance } from '../../../types/component';

export function createPageIndicator(
  pageCount: number,
  scrollContainer: HTMLElement
): ComponentInstance {
  let indicatorEl: HTMLElement | null = null;
  let observer: IntersectionObserver | null = null;

  return {
    mount(container: HTMLElement): void {
      if (pageCount <= 1) return;

      indicatorEl = document.createElement('nav');
      indicatorEl.className = 'vita-page-indicator';
      indicatorEl.setAttribute('aria-label', 'Page navigation');

      for (let i = 0; i < pageCount; i++) {
        const dot = document.createElement('button');
        dot.className = 'vita-page-dot';
        dot.setAttribute('aria-label', `Go to page ${i + 1}`);
        dot.dataset.page = String(i);
        if (i === 0) dot.dataset.active = 'true';

        dot.addEventListener('click', () => {
          const page = scrollContainer.querySelector<HTMLElement>(
            `[data-page="${i}"]`
          );
          page?.scrollIntoView({ behavior: 'smooth' });
        });

        indicatorEl.appendChild(dot);
      }

      // IntersectionObserver tracks which page is in view
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const pageEl = entry.target as HTMLElement;
            const pageIndex = pageEl.dataset.page;
            if (!indicatorEl || pageIndex === undefined) continue;

            indicatorEl.querySelectorAll<HTMLElement>('.vita-page-dot').forEach(dot => {
              dot.dataset.active = dot.dataset.page === pageIndex ? 'true' : 'false';
            });
          }
        },
        {
          root: scrollContainer,
          threshold: 0.5,
        }
      );

      scrollContainer.querySelectorAll<HTMLElement>('.vita-screen-page').forEach(page => {
        observer?.observe(page);
      });

      container.appendChild(indicatorEl);
    },

    destroy(): void {
      observer?.disconnect();
      observer = null;
      indicatorEl?.remove();
      indicatorEl = null;
    },
  };
}
