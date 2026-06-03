import './TechMarquee.css';
import { Project } from '../../../types/project';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

const EXTRA_TECHS = [
  'TypeScript', 'Vite', 'CSS Layers', 'WebGL', 'GSAP', 'Node.js',
  'GitHub Actions', 'Playwright', 'Storybook', 'Figma', 'WCAG AA',
  'Web Animations API', 'IntersectionObserver', 'View Transitions API',
];

export function createTechMarquee(projects: Project[]): ComponentInstance {
  let sectionEl: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      const projectTechs = projects.flatMap(p => p.techStack);
      // Deduplicate while preserving project techs first
      const chips = [...new Set([...projectTechs, ...EXTRA_TECHS])];

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
