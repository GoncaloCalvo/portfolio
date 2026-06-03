import './Hero.css';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

export function createHero(): ComponentInstance {
  let section: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      section = document.createElement('section');
      section.className = 'pro-hero';
      section.id = 'pro-about';
      section.setAttribute('aria-labelledby', 'pro-hero-title');

      section.innerHTML = `
        <div class="pro-hero__content">
          <p class="pro-hero__role">Senior Frontend Engineer / Creative Technologist</p>
          <h1 id="pro-hero-title" class="pro-hero__name">Your Name</h1>
          <p class="pro-hero__pitch">
            I architect browser-based interactive systems at the intersection of game UI and
            production web tooling — where sub-16ms frame budgets and accessible,
            maintainable code coexist.
          </p>
          <div class="pro-hero__cta">
            <a href="#pro-work" class="pro-hero__cta-primary">View My Work ↓</a>
            <a href="/cv.pdf" class="pro-hero__cta-secondary" download>Download CV</a>
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
