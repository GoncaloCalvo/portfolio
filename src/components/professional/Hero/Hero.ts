import './Hero.css';
import type { ComponentInstance } from '../../../types/component';

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
            I engineer async LLM pipelines and browser-based interactive systems at the
            intersection of semantic vector search and high-fidelity UI recreation —
            where production-grade Celery/ChromaDB architectures and sub-400ms view
            transitions are held to the same standard of correctness.
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
