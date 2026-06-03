import type { Project } from '../../../types/project';

export interface PanelsInstance {
  mount(container: HTMLElement): void;
  update(project: Project): void;
  destroy(): void;
}

function buildChallengeItem(title: string, description: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'vita-livearea-challenge-item';
  item.innerHTML = `
    <h4 class="vita-livearea-challenge-item__title">${title}</h4>
    <p class="vita-livearea-challenge-item__desc">${description}</p>
  `;
  return item;
}

function buildStackChip(tech: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'vita-livearea-stack-chip';
  chip.textContent = tech;
  return chip;
}

export function createLiveAreaPanels(): PanelsInstance {
  let panelsEl: HTMLElement | null = null;
  let descContent: HTMLElement | null = null;
  let challengesList: HTMLElement | null = null;
  let stackChips: HTMLElement | null = null;

  return {
    mount(container: HTMLElement): void {
      panelsEl = document.createElement('div');
      panelsEl.className = 'vita-livearea-panels';

      // Description panel — full width
      const descBlock = document.createElement('section');
      descBlock.className =
        'vita-livearea-panel-block vita-livearea-panel-block--description';

      const descTitle = document.createElement('h3');
      descTitle.className = 'vita-livearea-panel-block__title';
      descTitle.textContent = 'About';

      descContent = document.createElement('div');
      descContent.className = 'vita-livearea-panel-block__content';

      descBlock.appendChild(descTitle);
      descBlock.appendChild(descContent);

      // Challenges panel — left column
      const challengesBlock = document.createElement('section');
      challengesBlock.className =
        'vita-livearea-panel-block vita-livearea-panel-block--challenges';

      const challengesTitle = document.createElement('h3');
      challengesTitle.className = 'vita-livearea-panel-block__title';
      challengesTitle.textContent = 'Technical Challenges';

      challengesList = document.createElement('div');
      challengesList.className = 'vita-livearea-challenges-list';

      challengesBlock.appendChild(challengesTitle);
      challengesBlock.appendChild(challengesList);

      // Stack panel — right column
      const stackBlock = document.createElement('section');
      stackBlock.className =
        'vita-livearea-panel-block vita-livearea-panel-block--stack';

      const stackTitle = document.createElement('h3');
      stackTitle.className = 'vita-livearea-panel-block__title';
      stackTitle.textContent = 'Stack';

      stackChips = document.createElement('div');
      stackChips.className = 'vita-livearea-stack-chips';

      stackBlock.appendChild(stackTitle);
      stackBlock.appendChild(stackChips);

      panelsEl.appendChild(descBlock);
      panelsEl.appendChild(challengesBlock);
      panelsEl.appendChild(stackBlock);
      container.appendChild(panelsEl);
    },

    update(project: Project): void {
      if (descContent) {
        descContent.textContent = project.description;
      }

      if (challengesList) {
        challengesList.innerHTML = '';
        project.technicalChallenges.forEach(({ title, description }) => {
          challengesList!.appendChild(buildChallengeItem(title, description));
        });
      }

      if (stackChips) {
        stackChips.innerHTML = '';
        project.techStack.forEach(tech => {
          stackChips!.appendChild(buildStackChip(tech));
        });
      }
    },

    destroy(): void {
      panelsEl?.remove();
      panelsEl = null;
      descContent = null;
      challengesList = null;
      stackChips = null;
    },
  };
}
