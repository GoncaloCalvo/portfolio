export interface ProjectAssets {
  /** Square icon shown in Vita bubble (512x512 PNG, transparent background) */
  vitaBubbleIcon: string;
  /** Wide-format LiveArea banner image (960x544 PNG, matching Vita resolution ratio) */
  vitaLiveAreaBanner: string;
  /** Optional: screenshot or mockup for Professional View card (1200x800 PNG/WebP) */
  professionalCardImage?: string;
  /** Alt text for all images (accessibility requirement) */
  imageAlt: string;
}

export interface TechnicalChallenge {
  /** Short headline for the challenge (displayed as a panel header in LiveArea) */
  title: string;
  /** 2–4 sentence description of the problem and approach */
  description: string;
}

export interface ProjectLinks {
  /** Full GitHub repository URL. Required. */
  repository: string;
  /** Live deployment URL. Optional — some projects may be private or archived. */
  liveApp?: string;
  /** Optional: design spec, Figma link, or case study PDF */
  caseStudyUrl?: string;
}

export interface Project {
  /** Unique slug identifier. URL-safe lowercase with hyphens. e.g., "realtime-collab-editor" */
  id: string;
  /** Display title. Concise. Max 40 characters. */
  title: string;
  /** One-line tagline. Displayed in Vita bubble tooltip and Professional card subtitle. Max 80 chars. */
  subtitle: string;
  /** Full rich-text description. Markdown supported. Rendered in both LiveArea panel and Professional deep-dive. */
  description: string;
  /** Ordered array of technical challenges. 2–4 entries recommended. */
  technicalChallenges: TechnicalChallenge[];
  /** Array of technology tag strings. Order matters: list primary technologies first. */
  techStack: string[];
  links: ProjectLinks;
  assets: ProjectAssets;
  /** ISO 8601 date string of project completion or last major update. Used for sort ordering. */
  completedAt: string;
  /** Ordinal position in display grids. Lower numbers appear first. */
  displayOrder: number;
  /** If true, project is featured — rendered in primary position in Professional View hero section. */
  featured: boolean;
}

export type ProjectCatalog = Project[];
