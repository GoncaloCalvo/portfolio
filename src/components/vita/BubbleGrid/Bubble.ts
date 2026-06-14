import './Bubble.css';
import type { Project } from '../../../types/project';
import { audioManager } from '../../../state/audioState';
import type { ComponentInstance } from '../../../types/component';

export interface BubbleInstance extends ComponentInstance {
  getElement(): HTMLElement | null;
}

export interface BubbleCallbacks {
  onClick(project: Project, bubbleEl: HTMLElement): void;
}

export function getBubbleAnimationProps(index: number): {
  duration: number;
  delay: number;
  amplitude: number;
} {
  const seed = index * 137.508;
  const duration = 3.5 + (Math.sin(seed) * 0.5 + 0.5) * 2.5;
  const delay    = -(Math.cos(seed * 1.3) * 0.5 + 0.5) * 4;
  const amplitude = 8 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 10;
  return { duration, delay, amplitude };
}

export function createBubble(
  project: Project,
  index: number,
  callbacks: BubbleCallbacks
): BubbleInstance {
  let el: HTMLElement | null = null;
  let clickHandler: (() => void) | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  let hoverHandler: (() => void) | null = null;
  let focusHandler: (() => void) | null = null;

  return {
    mount(container: HTMLElement): void {
      const { duration, delay, amplitude } = getBubbleAnimationProps(index);

      el = document.createElement('article');
      el.className = 'vita-bubble';
      el.setAttribute('role', 'listitem');
      el.setAttribute('data-project-id', project.id);
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${project.title} — press Enter or Space to view details`);
      el.style.setProperty('--bubble-float-duration', `${duration.toFixed(2)}s`);
      el.style.setProperty('--bubble-float-delay', `${delay.toFixed(2)}s`);
      el.style.setProperty('--bubble-float-amplitude', `${amplitude.toFixed(1)}px`);

      el.innerHTML = `
        <div class="vita-bubble__inner">
          <img
            src="${project.assets.vitaBubbleIcon}"
            alt=""
            aria-hidden="true"
            width="512"
            height="512"
          />
          <div class="vita-bubble__glow" aria-hidden="true"></div>
        </div>
        <span class="vita-bubble__label">${project.title}</span>
      `;

      hoverHandler = () => audioManager.play('bubbleHover');
      focusHandler = () => audioManager.play('bubbleHover');

      clickHandler = () => {
        audioManager.play('bubbleClick');
        if (el) callbacks.onClick(project, el);
      };
      keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          audioManager.play('bubbleClick');
          if (el) callbacks.onClick(project, el);
        }
      };

      el.addEventListener('pointerenter', hoverHandler);
      el.addEventListener('focus', focusHandler);
      el.addEventListener('click', clickHandler);
      el.addEventListener('keydown', keyHandler);
      container.appendChild(el);
    },

    destroy(): void {
      if (el) {
        if (hoverHandler) el.removeEventListener('pointerenter', hoverHandler);
        if (focusHandler) el.removeEventListener('focus', focusHandler);
        if (clickHandler) el.removeEventListener('click', clickHandler);
        if (keyHandler) el.removeEventListener('keydown', keyHandler);
        el.remove();
        el = null;
      }
      hoverHandler = null;
      focusHandler = null;
      clickHandler = null;
      keyHandler = null;
    },

    getElement(): HTMLElement | null {
      return el;
    },
  };
}
