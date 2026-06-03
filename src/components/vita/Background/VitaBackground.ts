import './VitaBackground.css';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

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
