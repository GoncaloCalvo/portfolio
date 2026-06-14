import './VitaBackground.css';
import type { ComponentInstance } from '../../../types/component';

export function createVitaBackground(): ComponentInstance {
  let el: HTMLDivElement | null = null;

  return {
    mount(container: HTMLElement): void {
      el = document.createElement('div');
      el.className = 'vita-background';
      el.setAttribute('aria-hidden', 'true');
      container.prepend(el);
    },

    destroy(): void {
      el?.remove();
      el = null;
    },
  };
}
