import './Contact.css';
import type { ComponentInstance } from '../../../types/component';

const CONTACT_EMAIL = 'goncalocalvo1976@gmail.com';

export function createContact(): ComponentInstance {
  let section: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      section = document.createElement('section');
      section.className = 'pro-contact-section';
      section.id = 'pro-contact';
      section.setAttribute('aria-labelledby', 'pro-contact-heading');

      section.innerHTML = `
        <div class="pro-contact-section__inner">
          <h2 id="pro-contact-heading" class="pro-contact-section__heading">Get In Touch</h2>
          <p class="pro-contact-section__directive">
            Looking for opportunities to build reliable software, solve challenging problems, and collaborate with great teams.
          </p>
          <a
            href="mailto:${CONTACT_EMAIL}"
            class="pro-contact-section__email"
          >${CONTACT_EMAIL}</a>
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
