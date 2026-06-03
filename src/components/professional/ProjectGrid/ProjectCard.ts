import { Project } from '../../../types/project';

const MAX_VISIBLE_CHIPS = 4;

export function createProjectCard(project: Project): HTMLElement {
  const card = document.createElement('article');
  card.className = 'pro-card';

  const visibleTechs = project.techStack.slice(0, MAX_VISIBLE_CHIPS);
  const remainingCount = project.techStack.length - MAX_VISIBLE_CHIPS;

  const techChips = visibleTechs
    .map(t => `<li class="pro-card__tech-chip">${t}</li>`)
    .join('');

  const moreChip = remainingCount > 0
    ? `<li class="pro-card__tech-chip pro-card__tech-chip--more">+${remainingCount} more</li>`
    : '';

  const imageHtml = project.assets.professionalCardImage
    ? `<img
        class="pro-card__image"
        src="${project.assets.professionalCardImage}"
        alt="${project.assets.imageAlt}"
        width="1200"
        height="800"
        loading="lazy"
        decoding="async"
      />`
    : `<div class="pro-card__image-placeholder" aria-hidden="true">Image coming soon</div>`;

  const demoLink = project.links.liveApp
    ? `<a
        href="${project.links.liveApp}"
        class="pro-card__link"
        target="_blank"
        rel="noopener noreferrer"
      >Demo ↗</a>`
    : '';

  card.innerHTML = `
    <div class="pro-card__image-wrap">${imageHtml}</div>
    <div class="pro-card__body">
      <h3 class="pro-card__title">${project.title}</h3>
      <p class="pro-card__subtitle">${project.subtitle}</p>
      <ul class="pro-card__tech">${techChips}${moreChip}</ul>
      <div class="pro-card__links">
        <a
          href="${project.links.repository}"
          class="pro-card__link"
          target="_blank"
          rel="noopener noreferrer"
        >Code ↗</a>
        ${demoLink}
      </div>
    </div>
  `;

  return card;
}
