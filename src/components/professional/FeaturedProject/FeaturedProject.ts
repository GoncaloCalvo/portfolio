import './FeaturedProject.css';
import { Project } from '../../../types/project';
import type { ComponentInstance } from '../../../types/component';
import { renderMarkdown } from '../../../utils/markdown';
import { assetUrl } from '../../../utils/assetUrl';

export function createFeaturedProject(project: Project): ComponentInstance {
  let section: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      section = document.createElement('section');
      section.className = 'pro-featured-section';
      section.id = 'pro-work';
      section.setAttribute('aria-labelledby', 'pro-featured-title');

      const imageHtml = project.assets.professionalCardImage
        ? `<img
            class="pro-featured-card__image"
            src="${assetUrl(project.assets.professionalCardImage)}"
            alt="${project.assets.imageAlt}"
            width="1200"
            height="800"
            loading="lazy"
            decoding="async"
          />`
        : `<div class="pro-featured-card__image-placeholder" aria-hidden="true">Image coming soon</div>`;

      const techChips = project.techStack
        .map(t => `<li class="pro-featured-card__tech-chip">${t}</li>`)
        .join('');

      const repoLink = `<a
        href="${project.links.repository}"
        class="pro-featured-card__link"
        target="_blank"
        rel="noopener noreferrer"
      >GitHub ↗</a>`;

      const demoLink = project.links.liveApp
        ? `<a
            href="${project.links.liveApp}"
            class="pro-featured-card__link"
            target="_blank"
            rel="noopener noreferrer"
          >Live Demo ↗</a>`
        : '';

      section.innerHTML = `
        <p class="pro-featured-section__label">Featured Project</p>
        <div class="pro-featured-card">
          <div class="pro-featured-card__image-col">
            ${imageHtml}
          </div>
          <div class="pro-featured-card__meta">
            <span class="pro-featured-card__badge">Featured</span>
            <h2 id="pro-featured-title" class="pro-featured-card__title">${project.title}</h2>
            <p class="pro-featured-card__subtitle">${project.subtitle}</p>
            <hr class="pro-featured-card__rule" />
            <div class="pro-featured-card__description">${renderMarkdown(project.description)}</div>
            <ul class="pro-featured-card__tech">${techChips}</ul>
            <div class="pro-featured-card__links">
              ${repoLink}
              ${demoLink}
            </div>
          </div>
        </div>
      `;

      container.appendChild(section);
    },

    destroy(): void {
      section?.remove();
      section = null;
    },
  };
}
