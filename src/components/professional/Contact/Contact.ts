import './Contact.css';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

const CONTACT_EMAIL = 'hello@yourname.dev';

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
          <h2 id="pro-contact-heading" class="pro-contact-section__heading">Let's Work Together</h2>
          <p class="pro-contact-section__directive">
            Available for contract engagements, staff roles, and creative collaborations.
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
