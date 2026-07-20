import './Hero.css';
import type { ComponentInstance } from '../../../types/component';
import { assetUrl } from '../../../utils/assetUrl';

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
          <p class="pro-hero__role">Software Engineer / Creative Technologist</p>
          <h1 id="pro-hero-title" class="pro-hero__name">Gonçalo Calvo</h1>
          <p class="pro-hero__pitch">
            Informatics and Computing Engineering student at the University of Porto, graduating in 2026. 
            I build reliable backend systems, AI-powered applications, and modern web interfaces. 
            My focus is creating software that is correct, reproducible, thoroughly tested, and transparent about its results.
          </p>
          <div class="pro-hero__cta">
            <a href="#pro-work" class="pro-hero__cta-primary">View My Work ↓</a>
            <a href="${assetUrl('/cv.pdf')}" class="pro-hero__cta-secondary" download>Download CV</a>
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
