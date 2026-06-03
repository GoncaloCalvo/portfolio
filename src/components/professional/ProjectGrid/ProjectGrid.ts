import './ProjectGrid.css';
import { Project } from '../../../types/project';
import { createProjectCard } from './ProjectCard';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

export function createProjectGrid(projects: Project[]): ComponentInstance {
  let section: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      section = document.createElement('section');
      section.className = 'pro-grid-section';
      section.setAttribute('aria-labelledby', 'pro-grid-heading');

      const heading = document.createElement('div');
      heading.className = 'pro-grid-section__heading';
      heading.innerHTML = `
        <p class="pro-grid-section__label">Selected Work</p>
        <h2 id="pro-grid-heading" class="pro-grid-section__title">More Projects</h2>
      `;

      const grid = document.createElement('div');
      grid.className = 'pro-grid';

      if (projects.length === 0) {
        grid.innerHTML = `<p class="pro-grid__empty">More projects coming soon.</p>`;
      } else {
        const sorted = [...projects].sort((a, b) => a.displayOrder - b.displayOrder);
        for (const project of sorted) {
          grid.appendChild(createProjectCard(project));
        }
      }

      section.appendChild(heading);
      section.appendChild(grid);
      container.appendChild(section);
    },

    destroy(): void {
      section?.remove();
      section = null;
    },
  };
}
