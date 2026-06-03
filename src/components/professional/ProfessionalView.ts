import { ProjectCatalog } from '../../types/project';
import projectsData from '../../data/projects.json';
import { createNav } from './Nav/Nav';
import { createHero } from './Hero/Hero';
import { createTechMarquee } from './TechMarquee/TechMarquee';
import { createFeaturedProject } from './FeaturedProject/FeaturedProject';
import { createProjectGrid } from './ProjectGrid/ProjectGrid';
import { createContact } from './Contact/Contact';
import { createFooter } from './Footer/Footer';

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

export function createProfessionalView(): ComponentInstance {
  const catalog = (projectsData as ProjectCatalog).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  // featured falls back to first project if none is marked featured
  const featured = catalog.find(p => p.featured) ?? catalog[0];
  const gridProjects = catalog.filter(p => !p.featured);

  const nav = createNav();
  const hero = createHero();
  const marquee = createTechMarquee(catalog);
  const featuredProject = createFeaturedProject(featured);
  const projectGrid = createProjectGrid(gridProjects);
  const contact = createContact();
  const footer = createFooter();

  return {
    mount(container: HTMLElement): void {
      // container = #view-professional
      // <main id="main-content"> already exists in container from index.html
      const main = container.querySelector<HTMLElement>('#main-content') ?? container;

      // Nav is prepended so it appears before <main> in the DOM
      nav.mount(container);

      // Content sections are appended into <main>
      hero.mount(main);
      marquee.mount(main);
      featuredProject.mount(main);
      projectGrid.mount(main);
      contact.mount(main);

      // Footer is appended after <main>
      footer.mount(container);
    },

    destroy(): void {
      // Reverse mount order for clean teardown
      footer.destroy();
      contact.destroy();
      projectGrid.destroy();
      featuredProject.destroy();
      marquee.destroy();
      hero.destroy();
      nav.destroy();
    },
  };
}
