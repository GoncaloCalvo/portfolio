import type { Project } from '../../../types/project';

export interface BannerInstance {
  mount(container: HTMLElement): void;
  update(project: Project): void;
  destroy(): void;
}

export function createLiveAreaBanner(): BannerInstance {
  let bannerEl: HTMLElement | null = null;
  let imgEl: HTMLImageElement | null = null;
  let titleEl: HTMLElement | null = null;
  let subtitleEl: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      bannerEl = document.createElement('div');
      bannerEl.className = 'vita-livearea-banner';
      bannerEl.setAttribute('aria-hidden', 'true');

      imgEl = document.createElement('img');
      imgEl.className = 'vita-livearea-banner__image';
      imgEl.alt = '';

      const overlay = document.createElement('div');
      overlay.className = 'vita-livearea-banner__overlay';

      titleEl = document.createElement('h2');
      titleEl.className = 'vita-livearea-banner__title';
      titleEl.id = 'livearea-title';

      subtitleEl = document.createElement('p');
      subtitleEl.className = 'vita-livearea-banner__subtitle';

      overlay.appendChild(titleEl);
      overlay.appendChild(subtitleEl);
      bannerEl.appendChild(imgEl);
      bannerEl.appendChild(overlay);
      container.appendChild(bannerEl);
    },

    update(project: Project): void {
      if (imgEl) {
        imgEl.src = project.assets.vitaLiveAreaBanner;
        imgEl.alt = project.assets.imageAlt;
      }
      if (titleEl) titleEl.textContent = project.title;
      if (subtitleEl) subtitleEl.textContent = project.subtitle;
    },

    destroy(): void {
      bannerEl?.remove();
      bannerEl = null;
      imgEl = null;
      titleEl = null;
      subtitleEl = null;
    },
  };
}
