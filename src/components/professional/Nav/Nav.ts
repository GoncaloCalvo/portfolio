import './Nav.css';
import type { ComponentInstance } from '../../../types/component';

const SECTION_IDS = ['pro-about', 'pro-work', 'pro-contact'] as const;

export function createNav(): ComponentInstance {
  let navEl: HTMLElement | null = null;
  let scrollHandler: (() => void) | null = null;
  let observer: IntersectionObserver | null = null;

  function onScroll(): void {
    if (!navEl) return;
    navEl.classList.toggle('pro-nav--scrolled', window.scrollY > 80);
  }

  return {
    mount(container: HTMLElement): void {
      navEl = document.createElement('nav');
      navEl.id = 'pro-nav';
      navEl.className = 'pro-nav';
      navEl.setAttribute('aria-label', 'Primary navigation');

      navEl.innerHTML = `
        <a href="#main-content" class="pro-nav__logo">Portfolio</a>
        <div class="pro-nav__spacer" aria-hidden="true"></div>
        <ul class="pro-nav__links" role="list">
          <li role="listitem">
            <a href="#pro-about" class="pro-nav__link" data-nav-section="pro-about">About</a>
          </li>
          <li role="listitem">
            <a href="#pro-work" class="pro-nav__link" data-nav-section="pro-work">Work</a>
          </li>
          <li role="listitem">
            <a href="#pro-contact" class="pro-nav__link" data-nav-section="pro-contact">Contact</a>
          </li>
        </ul>
      `;

      scrollHandler = onScroll;
      window.addEventListener('scroll', scrollHandler, { passive: true });

      // IntersectionObserver: mark the nav link active when its section enters the viewport.
      // rootMargin keeps the trigger zone in the upper third of the screen.
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const link = navEl?.querySelector<HTMLElement>(
              `[data-nav-section="${entry.target.id}"]`
            );
            if (!link) continue;
            if (entry.isIntersecting) {
              navEl?.querySelectorAll('.pro-nav__link--active').forEach(el => {
                el.classList.remove('pro-nav__link--active');
                el.removeAttribute('aria-current');
              });
              link.classList.add('pro-nav__link--active');
              link.setAttribute('aria-current', 'page');
            }
          }
        },
        { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
      );

      // Nav is prepended so it sits before <main id="main-content"> in the DOM
      container.prepend(navEl);

      // Defer section observation — sections are appended by sibling components after mount()
      requestAnimationFrame(() => {
        SECTION_IDS.forEach(id => {
          const el = document.getElementById(id);
          if (el) observer?.observe(el);
        });
      });
    },

    destroy(): void {
      if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
        scrollHandler = null;
      }
      observer?.disconnect();
      observer = null;
      navEl?.remove();
      navEl = null;
    },
  };
}
