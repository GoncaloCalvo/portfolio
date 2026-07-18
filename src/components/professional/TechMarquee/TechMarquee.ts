import './TechMarquee.css';
import { Project } from '../../../types/project';
import type { ComponentInstance } from '../../../types/component';

// Curated, hand-ordered shortlist of the technologies worth foregrounding:
// languages first, then the frameworks and domain themes that recur across the
// work. Only names that actually appear in a project's techStack are rendered
// (see the intersection in mount), so the strip can never advertise tech no
// project backs, and it self-prunes when a project is added or removed.
const CURATED_TECHS = [
  'Python', 'TypeScript', 'C#', '.NET 10',
  'React', 'Electron', 'Vite',
  'FastAPI', 'PostgreSQL', 'Redis', 'Celery', 'Docker', 'LightGBM', 'ChromaDB',
  'AudioWorklet', 'Silk.NET',
];

export function createTechMarquee(projects: Project[]): ComponentInstance {
  let sectionEl: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      const projectTechs = new Set(projects.flatMap(p => p.techStack));
      // Keep only curated tech that an actual project backs, preserving curated order.
      const chips = CURATED_TECHS.filter(t => projectTechs.has(t));

      const chipItems = chips.map(t => `<li class="pro-marquee__chip">${t}</li>`).join('');

      sectionEl = document.createElement('section');
      sectionEl.className = 'pro-marquee-section';
      sectionEl.setAttribute('aria-label', 'Technology expertise');

      sectionEl.innerHTML = `
        <div class="pro-marquee-track" aria-hidden="true">
          <ul class="pro-marquee__list">${chipItems}</ul>
          <ul class="pro-marquee__list">${chipItems}</ul>
        </div>
        <ul class="pro-marquee__sr-list">
          ${chips.map(t => `<li>${t}</li>`).join('')}
        </ul>
      `;

      container.appendChild(sectionEl);
    },

    destroy(): void {
      sectionEl?.remove();
      sectionEl = null;
    },
  };
}
