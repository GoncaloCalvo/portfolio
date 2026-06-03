import './Footer.css';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

export function createFooter(): ComponentInstance {
  let footerEl: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      const year = new Date().getFullYear();

      footerEl = document.createElement('footer');
      footerEl.className = 'pro-footer';

      footerEl.innerHTML = `
        <div class="pro-footer__inner">
          <p class="pro-footer__copy">&copy; ${year} Gonçalo Calvo. All rights reserved.</p>
          <ul class="pro-footer__social" role="list">
            <li role="listitem">
              <a
                href="https://github.com/GoncaloCalvo"
                class="pro-footer__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub profile (opens in new tab)"
              >GitHub</a>
            </li>
            <li role="listitem">
              <a
                href="https://linkedin.com/in/goncalocalvo"
                class="pro-footer__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn profile (opens in new tab)"
              >LinkedIn</a>
            </li>
          </ul>
        </div>
      `;

      container.appendChild(footerEl);
    },

    destroy(): void {
      footerEl?.remove();
      footerEl = null;
    },
  };
}
