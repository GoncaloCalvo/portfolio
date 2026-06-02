# Master Design Document (MDD)
## Dual-Design System Portfolio Website
### Version 1.0 — Production Specification

---

> **Document Status:** Production-Ready  
> **Intended Audience:** Frontend Engineering Team, UI/UX Leads, QA Engineers  
> **Scope:** Full-stack frontend specification for a dual-view portfolio platform featuring a Professional Executive View and an Interactive PS Vita Immersive View, controlled by a persistent view-toggle mechanism.

---

## TABLE OF CONTENTS

1. [Architectural Overview](#1-architectural-overview)
2. [Data Architecture — JSON Schema](#2-data-architecture--json-schema)
3. [View 1: Professional Executive View Specification](#3-view-1-professional-executive-view-specification)
4. [View 2: Interactive PS Vita View Specification](#4-view-2-interactive-ps-vita-view-specification)
5. [The View Switcher Toggle Mechanism](#5-the-view-switcher-toggle-mechanism)
6. [Component & Directory Tree](#6-component--directory-tree)

---

## 1. ARCHITECTURAL OVERVIEW

### 1.1 Tech Stack Selection

#### Primary Recommendation: Vite + TypeScript + Vanilla DOM

| Layer | Technology | Justification |
|---|---|---|
| Build Tool | Vite 5.x | Sub-100ms HMR, native ESM, zero-config static output. Tree-shaking eliminates dead code. |
| Language | TypeScript 5.x | Strict schema enforcement for project data, zero-cost abstractions, eliminates runtime type errors in toggle state logic. |
| Styling | CSS Modules + PostCSS | Scoped styles per component, no runtime CSS-in-JS overhead. `postcss-nested` for ergonomic nesting. |
| Animations | GSAP 3.x (club-optional) or Web Animations API | GSAP for orchestrated multi-step transitions (view switch). WAAPI for idle bubble floats and lightweight micro-interactions. |
| Audio | Howler.js 2.x | Lightweight (~7KB gzipped), sprite-based sound loading, handles browser autoplay policy gracefully. |
| Icons | Lucide (tree-shakeable SVG) | SVGs inline at build time, zero icon font overhead. |
| Deployment | Vite's `vite build` → GitHub Pages or Vercel | `base` config key handles subdirectory routing on GitHub Pages. Vercel auto-detects Vite; zero-config CI. |

**Alternate Stack (If Component Complexity Grows):** Astro 4.x with Islands Architecture — allows shipping zero JS for the Professional View by default, hydrating only the interactive Vita view on demand. Recommended if the project catalog exceeds 20 entries or if blog/writing sections are added later.

**Explicitly Rejected:**
- Next.js: SSR overhead is unnecessary for a static portfolio; adds cold-start latency and deployment complexity without measurable benefit.
- Create React App: Deprecated, Webpack-based, catastrophically slow compared to Vite.
- jQuery: No justification in 2024+ for a greenfield project.

#### Core Web Vitals Targets

| Metric | Target | Strategy |
|---|---|---|
| LCP | < 1.2s | Hero content inline in HTML, no render-blocking JS. |
| CLS | 0.00 | Fixed dimensions on all images and bubble containers declared in CSS. |
| INP | < 100ms | Event handlers debounced; view transitions use `requestAnimationFrame`. |
| FID | < 50ms | No synchronous main-thread blocking. Audio sprites preloaded on first pointer interaction. |

---

### 1.2 State Management

#### Global View State

View state is a single enumerated string value: `'professional' | 'vita'`. It is not a complex state tree. No external state management library (Redux, Zustand, Nanostores) is warranted. The following architecture governs it:

```typescript
// src/state/viewState.ts

export type ViewMode = 'professional' | 'vita';

const VIEW_STATE_KEY = 'portfolio_view_mode';
const DEFAULT_VIEW: ViewMode = 'professional';

export const ViewState = {
  get(): ViewMode {
    const stored = localStorage.getItem(VIEW_STATE_KEY) as ViewMode | null;
    return stored === 'vita' ? 'vita' : DEFAULT_VIEW;
  },

  set(mode: ViewMode): void {
    localStorage.setItem(VIEW_STATE_KEY, mode);
    document.documentElement.setAttribute('data-view', mode);
    window.dispatchEvent(new CustomEvent('viewchange', { detail: { mode } }));
  },

  toggle(): ViewMode {
    const next: ViewMode = ViewState.get() === 'professional' ? 'vita' : 'professional';
    ViewState.set(next);
    return next;
  }
};
```

#### FOUC Prevention

The single most critical initialization step. The following inline script **must** be injected as the first child of `<head>`, before any stylesheet link, before any module script:

```html
<!-- index.html — MUST be first element in <head> -->
<script>
  (function() {
    var mode = localStorage.getItem('portfolio_view_mode') || 'professional';
    document.documentElement.setAttribute('data-view', mode);
  })();
</script>
```

This ensures `[data-view="professional"]` or `[data-view="vita"]` is present on `<html>` before the CSSOM is constructed. Both view containers are styled with `display: none` by default in the CSS; the attribute selector activates the correct one. Because this script is synchronous and tiny (< 200 bytes), it adds negligible parse time.

#### Event-Driven Component Communication

Components subscribe to the `viewchange` custom event dispatched on `window`. This decouples the toggle button from the view containers:

```typescript
// Any component that needs to respond to view changes:
window.addEventListener('viewchange', (e: CustomEvent<{ mode: ViewMode }>) => {
  // handle transition
});
```

#### Mute State

Audio mute preference follows the identical pattern, stored under `portfolio_audio_muted`. Defaults to `false` (unmuted) but gracefully handles browsers with `AudioContext` suspended until first user interaction.

---

## 2. DATA ARCHITECTURE — JSON SCHEMA

### 2.1 Schema Definition

All portfolio project data lives in a single source-of-truth JSON file at `src/data/projects.json`. Both the Professional View and the Vita View consume identical data. View-specific rendering differences are purely presentational — no data duplication, no view-specific data files.

```typescript
// src/types/project.ts — TypeScript schema (source of truth)

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
```

### 2.2 Example Data Instance

```json
[
  {
    "id": "realtime-collab-editor",
    "title": "Realtime Collaborative Editor",
    "subtitle": "Google Docs-scale conflict resolution using CRDTs in the browser",
    "description": "A fully browser-based collaborative text editor built on Yjs CRDTs and WebRTC peer signaling. Supports concurrent multi-cursor editing with sub-50ms sync latency across LAN peers. Implements a custom undo/redo stack that respects concurrent edit history.",
    "technicalChallenges": [
      {
        "title": "CRDT Merge Conflicts Under High Concurrency",
        "description": "Standard OT algorithms fail under simultaneous three-way edits. Yjs Y.Text with CRDT semantics resolves all merge cases deterministically without a central authority server, enabling true peer-to-peer convergence."
      },
      {
        "title": "WebRTC Signaling Without a Dedicated Server",
        "description": "Used y-webrtc's built-in BroadcastChannel fallback for same-device tabs and a lightweight Cloudflare Worker as the ICE signaling relay, keeping infrastructure costs at zero for the demo tier."
      }
    ],
    "techStack": ["TypeScript", "Yjs", "WebRTC", "ProseMirror", "Vite", "Cloudflare Workers"],
    "links": {
      "repository": "https://github.com/username/realtime-collab-editor",
      "liveApp": "https://collab-editor.username.dev"
    },
    "assets": {
      "vitaBubbleIcon": "/assets/vita/icons/collab-editor-bubble.png",
      "vitaLiveAreaBanner": "/assets/vita/banners/collab-editor-banner.png",
      "professionalCardImage": "/assets/professional/collab-editor-card.webp",
      "imageAlt": "Screenshot of collaborative editor with two cursors visible in a shared document"
    },
    "completedAt": "2024-08-15",
    "displayOrder": 1,
    "featured": true
  }
]
```

### 2.3 Asset Dimension Requirements

| Asset Key | Dimensions | Format | Max File Size | Notes |
|---|---|---|---|---|
| `vitaBubbleIcon` | 512 × 512 px | PNG (transparent bg) | 150 KB | Rendered at 96px in bubble; source must be hi-res for retina |
| `vitaLiveAreaBanner` | 960 × 544 px | PNG or WebP | 400 KB | Exact Vita screen ratio (16:9.06). Will be cropped to fill. |
| `professionalCardImage` | 1200 × 800 px | WebP preferred | 300 KB | Displayed at 600×400 max in card; WebP mandatory for CWV |

---

## 3. VIEW 1: PROFESSIONAL EXECUTIVE VIEW SPECIFICATION

### 3.1 Design Philosophy

The Professional Executive View is engineered for the following user context: a technical recruiter or engineering hiring manager who has 20–30 seconds of initial attention before deciding to continue reading. Every layout decision, typographic scale, and information hierarchy choice must serve rapid comprehension, credibility signaling, and friction-free contact initiation.

Design tone: **Refined editorial minimalism**. Think a high-end technical consultancy's case study publication, not a startup landing page. White space is generous. Color is restrained. Typography does the heavy lifting.

### 3.2 Typography System

```css
/* src/styles/professional/typography.css */

:root[data-view="professional"] {
  /* Display font: Instrument Serif — editorial authority, not sterile */
  --font-display: 'Instrument Serif', 'Georgia', serif;
  /* Body font: DM Mono — signals technical precision without being cold */
  --font-mono: 'DM Mono', 'Fira Code', monospace;
  /* UI font: Geist — clean, modern, distinct from Inter/Roboto mainstream */
  --font-ui: 'Geist', 'Helvetica Neue', sans-serif;

  --type-scale-xs:   0.75rem;   /* 12px — labels, captions */
  --type-scale-sm:   0.875rem;  /* 14px — metadata, secondary info */
  --type-scale-base: 1rem;      /* 16px — body copy */
  --type-scale-md:   1.125rem;  /* 18px — card descriptions */
  --type-scale-lg:   1.5rem;    /* 24px — section headers */
  --type-scale-xl:   2.5rem;    /* 40px — hero name */
  --type-scale-2xl:  4rem;      /* 64px — display headline */

  --line-height-tight:  1.2;
  --line-height-body:   1.65;
  --line-height-loose:  1.9;

  --letter-spacing-tight:  -0.03em;
  --letter-spacing-normal:  0em;
  --letter-spacing-wide:    0.08em;
  --letter-spacing-widest:  0.15em;
}
```

**Font Loading Strategy:** Use `<link rel="preconnect">` and `font-display: swap` on Google Fonts imports. Subset fonts to Latin character set only. Load display font (Instrument Serif) as a priority resource with `<link rel="preload">`.

### 3.3 Color System

```css
:root[data-view="professional"] {
  --color-bg-primary:    #F8F7F4;  /* Warm off-white — less harsh than pure white */
  --color-bg-secondary:  #EDECEA;  /* Subtle card backgrounds */
  --color-bg-inverse:    #0F0F0E;  /* Used for footer, hero accent blocks */

  --color-text-primary:  #0F0F0E;  /* Near-black — richer than pure #000 */
  --color-text-secondary:#4A4845;  /* Medium gray for secondary copy */
  --color-text-tertiary: #8C8986;  /* Light gray for metadata, captions */
  --color-text-inverse:  #F8F7F4;

  --color-accent-primary: #1A3A5C;  /* Deep navy — professional authority */
  --color-accent-secondary:#C8A97E; /* Warm gold — deliberate, not garish */
  --color-accent-tertiary: #2D6A4F; /* Muted forest green — for tech tag chips */

  --color-border-subtle:  rgba(15, 15, 14, 0.08);
  --color-border-medium:  rgba(15, 15, 14, 0.16);
}
```

### 3.4 Layout Architecture

The Professional View is a **single-page document** with smooth anchor scrolling. No routing. No page transitions between sections. Sections are separated by generous vertical rhythm, not decorative dividers.

```
┌─────────────────────────────────────────────────┐
│  STICKY NAV BAR (64px height)                   │
│  [Name/Logo]  [About] [Work] [Contact]  [TOGGLE]│
├─────────────────────────────────────────────────┤
│                                                   │
│  HERO SECTION (100vh, centered)                  │
│  ┌───────────────────────────────────┐           │
│  │ Role Descriptor (DM Mono, 14px)   │           │
│  │ FULL NAME (Instrument Serif, 64px)│           │
│  │ Elevator Pitch (2–3 lines, 18px)  │           │
│  │ [View Work ↓]  [Download CV]      │           │
│  └───────────────────────────────────┘           │
│                                                   │
├─────────────────────────────────────────────────┤
│  TECH STACK GRID (auto-scrolling marquee)        │
├─────────────────────────────────────────────────┤
│                                                   │
│  FEATURED PROJECT (full-width asymmetric card)   │
│  60/40 split: image left, case study right       │
│                                                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  PROJECT GRID (3-column responsive)              │
│  Each card: image, title, tags, 2-line desc      │
│                                                   │
├─────────────────────────────────────────────────┤
│  CONTACT SECTION (centered, minimal)             │
├─────────────────────────────────────────────────┤
│  FOOTER (copyright, social links)                │
└─────────────────────────────────────────────────┘
```

### 3.5 Section-by-Section Specifications

#### 3.5.1 Sticky Navigation Bar

```typescript
// Behavior specification
interface NavBehavior {
  position: 'sticky';
  top: 0;
  zIndex: 900;
  height: '64px';
  backdropFilter: 'blur(12px) saturate(1.2)';
  backgroundColor: 'rgba(248, 247, 244, 0.85)';
  borderBottom: '1px solid var(--color-border-subtle)';
  // Opacity and border appear only after scrolling 80px from top
  transitionOnScroll: true;
  scrollThreshold: 80; // px
}
```

Nav links use `font-family: var(--font-ui)`, `font-size: 14px`, `letter-spacing: 0.05em`, `text-transform: uppercase`. Active section link gets `color: var(--color-accent-primary)` via IntersectionObserver tracking.

The **View Toggle button** (see Section 5) occupies the far-right position in the nav. It must not be confused with a nav link. It is visually distinct — enclosed in a pill-shaped container.

#### 3.5.2 Hero Section

The hero section must communicate the following information hierarchy, in order, within the first visual scan:

1. **Role identifier** (e.g., "Senior Frontend Engineer / Creative Technologist") — `DM Mono`, 13px, `letter-spacing: 0.1em`, `text-transform: uppercase`, `color: var(--color-text-tertiary)`. Displayed above the name.
2. **Full name** — `Instrument Serif`, 56–72px (fluid clamp), `letter-spacing: -0.03em`. Single line preferred.
3. **Elevator pitch** — 2–3 sentences, `font-size: clamp(1rem, 2vw, 1.25rem)`, `color: var(--color-text-secondary)`, `max-width: 60ch`. Must fit the following formula: `[What you build] + [The constraint or domain you operate in] + [Measurable or qualitative outcome]`. Example: *"I architect browser-based interactive systems at the intersection of game UI and production web tooling — where sub-16ms frame budgets and accessible, maintainable code coexist."*
4. **CTA row** — Two buttons: primary "View My Work" (dark filled) and secondary "Download CV" (outlined). Gap of `16px` between.

No hero background image or video. Background is `var(--color-bg-primary)` with a single subtle diagonal texture applied via CSS `background-image: url("data:image/svg+xml,...")` noise pattern at 2% opacity.

#### 3.5.3 Tech Stack Marquee

A single horizontal row of technology tags rendered as auto-scrolling marquee. Uses CSS `animation: marqueeScroll linear infinite` on a duplicated list (two identical `<ul>` elements side-by-side inside a masked container) to create seamless infinite scroll. No JavaScript required.

```css
.marquee-track {
  display: flex;
  width: max-content;
  animation: marqueeScroll 30s linear infinite;
}

@keyframes marqueeScroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); } /* -50% because track is doubled */
}

.marquee-wrapper:hover .marquee-track {
  animation-play-state: paused;
}
```

Each tag chip: `background: var(--color-bg-secondary)`, `border: 1px solid var(--color-border-medium)`, `font-family: var(--font-mono)`, `font-size: 13px`, `padding: 6px 12px`, `border-radius: 4px`. Tags are not interactive in this context — purely informational.

#### 3.5.4 Featured Project Card

The single `featured: true` project in the data catalog renders as a full-width asymmetric card. On desktop (≥ 1024px):
- Left column (60% width): project image with `border-radius: 8px`, fills column height with `object-fit: cover`.
- Right column (40% width): project metadata panel.

Right column content structure:
```
[FEATURED — DM Mono, 11px, gold color, letter-spacing 0.15em]
[Project Title — Instrument Serif, 36px]
[Subtitle — 16px, text-secondary]
[Horizontal rule — 1px, border-subtle]
[Description — 16px, line-height 1.65, max 4 lines with "Read more" toggle]
[Tech Stack chips row]
[Links row: [GitHub ↗]  [Live Demo ↗]]
```

On mobile (< 1024px): stacks vertically, image on top, metadata below. Image aspect ratio locked at 3/2.

#### 3.5.5 Project Grid

All non-featured projects render in a responsive CSS Grid:

```css
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}
```

Each card:
- Fixed aspect ratio container for image: `aspect-ratio: 3/2`
- Card background: `var(--color-bg-secondary)`
- On hover: `transform: translateY(-4px)`, `box-shadow: 0 12px 32px rgba(0,0,0,0.08)` — easing `cubic-bezier(0.25, 0.46, 0.45, 0.94)`, duration `200ms`
- Tech stack chips: first 4 tags displayed, remaining collapsed into `+N more` chip
- Two action links as icon-text pairs (GitHub icon + "Code", ExternalLink icon + "Demo")

#### 3.5.6 Contact Section

Deliberately minimal. Three elements only:
1. Section label: "Let's Work Together" — `Instrument Serif`, 40px
2. One-line directive: "Available for contract engagements, staff roles, and creative collaborations." — 18px
3. Email as a large, styled `<a>` link: `DM Mono`, 22px, underlined on hover with animated underline using `::after` pseudo-element.

No contact form. Forms introduce CSRF complexity, spam handling, and third-party dependency. Direct email reduces friction for serious inquirers.

### 3.6 Semantic HTML & Accessibility Requirements

- Document uses one `<h1>` (the name in the hero).
- Section headers are `<h2>`. Project card titles are `<h3>`.
- All interactive elements must have `focus-visible` styles: `outline: 2px solid var(--color-accent-primary)`, `outline-offset: 3px`.
- Color contrast ratios must meet WCAG AA: all text on `--color-bg-primary` must achieve ≥ 4.5:1.
- All images must have meaningful `alt` attributes sourced from `assets.imageAlt` in the project schema.
- The marquee animation must respect `prefers-reduced-motion`: `@media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }`
- Navigation landmark: `<nav aria-label="Primary navigation">`.
- Skip-to-content link as first focusable element: `<a href="#main-content" class="skip-link">`.

---

## 4. VIEW 2: INTERACTIVE PS VITA VIEW SPECIFICATION

### 4.1 Design Philosophy

The Vita View is an **immersive console UI recreation** — not a passing aesthetic reference, but a precise functional analog to the PS Vita XMB and LiveArea interfaces. It communicates to creative and game-development hiring audiences that the builder understands interactive system design, animation budgeting, and UI/UX at the layer below the DOM. Every component must feel earned, not decorative.

Design tone: **Technical nostalgia, rigorously executed.** The Vita's original design language is referenced precisely: `#00BFFF` (cerulean blue) accent system, wave backgrounds, glossy icon surfaces, the specific spatial grammar of the LiveArea popup.

### 4.2 Component 1 — The Home Screen

#### 4.2.1 Full-Screen Background System

The background is a **layered SVG gradient animation** simulating the Vita's live wallpaper. It is implemented entirely in CSS and SVG — no Canvas, no WebGL, no video — to preserve performance budget.

```css
/* src/styles/vita/background.css */

.vita-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 80%, rgba(0, 100, 200, 0.35) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 20%, rgba(80, 0, 180, 0.25) 0%, transparent 60%),
    radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0, 10, 40, 1) 40%, rgba(0, 30, 80, 1) 100%);
  overflow: hidden;
}

/* Animated SVG wave overlay */
.vita-background::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/assets/vita/svg/wave-pattern.svg') repeat-x bottom;
  background-size: 200% 40%;
  animation: vitaWaveDrift 12s ease-in-out infinite alternate;
  opacity: 0.15;
}

@keyframes vitaWaveDrift {
  0%   { background-position: 0% bottom; }
  100% { background-position: 100% bottom; }
}
```

The SVG wave file (`wave-pattern.svg`) is a hand-authored smooth sinusoidal path with `fill="rgba(0,191,255,0.6)"`. It should have two overlapping wave paths at slightly different frequencies to avoid mechanical repetition.

A secondary particle layer uses a CSS `radial-gradient` repeated at pseudo-random positions via a long animation cycle (60s) on a `::before` pseudo-element — simulating the Vita's ambient floating light particles.

#### 4.2.2 Project Bubble Grid

Bubbles are circular elements arranged in a **responsive staggered grid**. Each bubble represents one project.

**Structural HTML:**
```html
<div class="vita-bubble-grid" role="list" aria-label="Project bubbles">
  <article
    class="vita-bubble"
    role="listitem"
    data-project-id="realtime-collab-editor"
    tabindex="0"
    aria-label="Realtime Collaborative Editor — tap to view details"
    style="--bubble-float-duration: 4.2s; --bubble-float-delay: -1.3s; --bubble-float-amplitude: 12px;"
  >
    <div class="vita-bubble__inner">
      <img src="/assets/vita/icons/collab-editor-bubble.png" alt="" aria-hidden="true" />
      <div class="vita-bubble__glow" aria-hidden="true"></div>
    </div>
    <span class="vita-bubble__label">Collab Editor</span>
  </article>
</div>
```

Note: The `alt=""` on the bubble icon image is intentional. The accessible label is on the `<article>` element. The image is purely decorative within the article's accessible name.

**Bubble Dimensions & Grid:**
```css
.vita-bubble-grid {
  display: grid;
  /* Responsive: 4 columns on desktop, 3 on tablet, 2 on mobile */
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: clamp(20px, 4vw, 48px);
  padding: clamp(32px, 6vw, 80px);
  align-content: start;
}

.vita-bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.vita-bubble__inner {
  position: relative;
  width: clamp(80px, 12vw, 120px);
  height: clamp(80px, 12vw, 120px);
  border-radius: 50%;
  /* Glossy surface effect */
  background: radial-gradient(
    ellipse 60% 40% at 40% 30%,
    rgba(255, 255, 255, 0.45) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  box-shadow:
    0 0 0 1.5px rgba(0, 191, 255, 0.4),
    0 8px 24px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.2);
  overflow: hidden;
  /* Float animation — CSS custom properties allow per-bubble variation */
  animation: vitaBubbleFloat var(--bubble-float-duration, 4s)
             ease-in-out
             infinite
             alternate
             var(--bubble-float-delay, 0s);
}
```

**Desynchronized Float Animation:**

Each bubble's `--bubble-float-duration` and `--bubble-float-delay` are assigned in the JavaScript render loop using deterministic pseudo-random values based on the bubble's `displayOrder` index. This avoids synchronized "breathing" that would feel artificial:

```typescript
// src/components/vita/BubbleGrid.ts

function getBubbleAnimationProps(index: number): { duration: number; delay: number; amplitude: number } {
  // Seeded pseudo-random using index to ensure stable values across re-renders
  const seed = index * 137.508; // Golden angle multiplier — distributes values evenly
  const duration = 3.5 + (Math.sin(seed) * 0.5 + 0.5) * 2.5; // Range: 3.5s – 6.0s
  const delay    = -(Math.cos(seed * 1.3) * 0.5 + 0.5) * 4;  // Range: 0s – -4s (negative for mid-animation start)
  const amplitude = 8 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 10; // Range: 8px – 18px
  return { duration, delay, amplitude };
}
```

```css
@keyframes vitaBubbleFloat {
  0%   { transform: translateY(0) rotate(-1deg); }
  50%  { transform: translateY(calc(var(--bubble-float-amplitude, 12px) * -1)) rotate(0.5deg); }
  100% { transform: translateY(calc(var(--bubble-float-amplitude, 12px) * -0.4)) rotate(1deg); }
}
```

The subtle `rotate` values (< 1.5°) add organic micro-wobble that prevents the float from looking like a simple sine wave.

**Bubble Glow Layer:**
```css
.vita-bubble__glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse 70% 50% at 50% 50%,
    rgba(0, 191, 255, 0.2) 0%,
    transparent 70%
  );
  animation: vitaBubbleGlowPulse 3s ease-in-out infinite;
  animation-delay: var(--bubble-float-delay, 0s);
}

@keyframes vitaBubbleGlowPulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1.0; }
}
```

**Hover State:**
```css
.vita-bubble:hover .vita-bubble__inner,
.vita-bubble:focus-visible .vita-bubble__inner {
  transform: scale(1.12) translateY(-4px);
  box-shadow:
    0 0 0 2px rgba(0, 191, 255, 0.8),
    0 0 20px rgba(0, 191, 255, 0.5),
    0 12px 32px rgba(0, 0, 0, 0.6);
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 200ms ease-out;
  /* Pause float during hover for crisp interactive feedback */
  animation-play-state: paused;
}
```

**Label:**
```css
.vita-bubble__label {
  font-family: var(--font-vita-ui); /* 'SCE PlayStation', fallback: 'Rajdhani', sans-serif */
  font-size: clamp(9px, 1.5vw, 12px);
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  letter-spacing: 0.04em;
}
```

**Vita UI Font:** The closest free approximation to the Vita's system font is `Rajdhani` (Google Fonts) — geometric, condensed, and legible at small sizes. Load with `font-weight: 400; 600` subset.

---

### 4.3 Component 2 — Scroll-Snapping Pages

When projects exceed the viewport capacity of a single screen (recommended maximum: 8 bubbles per page to maintain visual density), the grid expands across multiple full-screen "pages" that snap on vertical scroll.

#### Scroll Container Specification

```css
.vita-scroll-container {
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  /* Hide scrollbar while preserving scroll functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.vita-scroll-container::-webkit-scrollbar {
  display: none;
}

.vita-screen-page {
  height: 100vh;
  scroll-snap-align: start;
  scroll-snap-stop: always; /* Prevents scroll momentum from skipping pages */
  position: relative;
  display: flex;
  flex-direction: column;
}
```

#### Page Indicator Dots

A vertical column of dots on the right edge indicates current page position. CSS-only implementation using `:nth-child` selectors on the dot list, driven by the `:has()` selector on the scroll container is preferred where browser support allows (Chrome 105+, Safari 15.4+). For Firefox compatibility, a lightweight IntersectionObserver updates a `data-active-page` attribute on the container.

```css
/* Fallback IntersectionObserver approach */
.vita-page-indicator {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
}

.vita-page-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  transition: background 300ms ease, transform 300ms ease;
}

.vita-page-dot[data-active="true"] {
  background: rgba(0, 191, 255, 0.9);
  transform: scale(1.5);
}
```

---

### 4.4 Component 3 — The LiveArea Screen

#### 4.4.1 Trigger Behavior

When a project bubble is clicked (or receives `Enter`/`Space` keypress), the LiveArea overlay opens. The transition from bubble tap to LiveArea open must feel like the original Vita's LiveArea expansion: the bubble scales up and the LiveArea panel appears to emerge from it.

**Opening Animation Sequence (total: 280ms):**

1. **0–80ms:** Clicked bubble scales to `1.2` and `opacity` fades to `0.6`.
2. **60–180ms:** LiveArea overlay fades in (`opacity: 0 → 1`) and scales from `0.92 → 1.0` using `cubic-bezier(0.22, 1, 0.36, 1)` (fast-out, ease-in spring).
3. **180–280ms:** Bubble grid dims to `opacity: 0.3` (world behind the LiveArea recedes).

#### 4.4.2 LiveArea Overlay Structure

```html
<div
  class="vita-livearea-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="livearea-title"
  id="livearea-overlay"
>
  <div class="vita-livearea-backdrop" aria-hidden="true"></div>

  <div class="vita-livearea-panel">

    <!-- BANNER REGION -->
    <div class="vita-livearea-banner" aria-hidden="true">
      <img
        class="vita-livearea-banner__image"
        src=""  <!-- populated dynamically -->
        alt=""  <!-- populated from assets.imageAlt -->
      />
      <!-- Title overlay on banner -->
      <div class="vita-livearea-banner__overlay">
        <h2 class="vita-livearea-banner__title" id="livearea-title"></h2>
        <p class="vita-livearea-banner__subtitle"></p>
      </div>
    </div>

    <!-- START BUTTON ZONE -->
    <div class="vita-livearea-startzone">
      <!-- "START" button links to liveApp if available, else repository -->
      <a
        class="vita-livearea-start-btn"
        href=""
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby="livearea-title"
      >
        <span class="vita-start-btn__label">START</span>
        <span class="vita-start-btn__icon" aria-hidden="true">▶</span>
      </a>
      <a class="vita-livearea-code-link" href="" target="_blank" rel="noopener noreferrer">
        View Source Code
      </a>
    </div>

    <!-- INFORMATION PANELS -->
    <div class="vita-livearea-panels">

      <section class="vita-livearea-panel-block vita-livearea-panel-block--description">
        <h3 class="vita-livearea-panel-block__title">About</h3>
        <div class="vita-livearea-panel-block__content"></div>
      </section>

      <section class="vita-livearea-panel-block vita-livearea-panel-block--challenges">
        <h3 class="vita-livearea-panel-block__title">Technical Challenges</h3>
        <div class="vita-livearea-challenges-list"></div>
      </section>

      <section class="vita-livearea-panel-block vita-livearea-panel-block--stack">
        <h3 class="vita-livearea-panel-block__title">Stack</h3>
        <div class="vita-livearea-stack-chips"></div>
      </section>

    </div>

    <!-- CLOSE CONTROL -->
    <button
      class="vita-livearea-close"
      aria-label="Close project details"
      type="button"
    >
      <span aria-hidden="true">✕</span>
    </button>

  </div>
</div>
```

#### 4.4.3 LiveArea Visual Specifications

**Backdrop:**
```css
.vita-livearea-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
}
```

**Panel Container:**
```css
.vita-livearea-panel {
  position: relative;
  width: min(960px, 95vw);
  max-height: 90vh;
  overflow-y: auto;
  margin: auto;
  border-radius: 4px;
  background: rgba(8, 14, 30, 0.96);
  border: 1px solid rgba(0, 191, 255, 0.25);
  box-shadow:
    0 0 0 1px rgba(0, 191, 255, 0.1),
    0 32px 80px rgba(0, 0, 0, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  /* Custom scrollbar to match Vita aesthetic */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 191, 255, 0.4) transparent;
}
```

**Banner Region:**
```css
.vita-livearea-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 960 / 200; /* Vita LiveArea banner proportion */
  overflow: hidden;
  border-radius: 4px 4px 0 0;
}

.vita-livearea-banner__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

.vita-livearea-banner__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.2) 60%,
    transparent 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px 28px;
}

.vita-livearea-banner__title {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  font-size: clamp(20px, 3vw, 32px);
  color: #FFFFFF;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  margin: 0;
}
```

**START Button:**
```css
.vita-livearea-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 40px;
  background: linear-gradient(
    135deg,
    rgba(0, 140, 230, 0.9) 0%,
    rgba(0, 80, 180, 0.9) 100%
  );
  border: 1px solid rgba(0, 191, 255, 0.6);
  border-radius: 3px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.2em;
  color: #FFFFFF;
  text-decoration: none;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    0 0 20px rgba(0, 191, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: box-shadow 150ms ease, transform 150ms ease;
}

.vita-livearea-start-btn:hover {
  box-shadow:
    0 0 32px rgba(0, 191, 255, 0.6),
    0 0 8px rgba(0, 191, 255, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}
```

**Information Panels:**

The panels below the banner and START zone are arranged in a CSS Grid:

```css
.vita-livearea-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1px; /* panels are separated by 1px hairline gap — appears as border */
  background: rgba(0, 191, 255, 0.1); /* Gap becomes the border color */
  padding: 1px;
}

.vita-livearea-panel-block {
  background: rgba(8, 14, 30, 0.96);
  padding: 20px 24px;
}

.vita-livearea-panel-block--description {
  grid-column: 1 / -1; /* Spans full width */
}

.vita-livearea-panel-block__title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(0, 191, 255, 0.7);
  margin: 0 0 12px;
}

.vita-livearea-panel-block__content {
  font-family: var(--font-vita-body); /* 'DM Sans', sans-serif */
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.8);
}
```

#### 4.4.4 LiveArea Keyboard Navigation

- `Escape`: closes LiveArea, returns focus to the originating bubble.
- `Tab`/`Shift+Tab`: cycles through START button, Code link, close button, and panel links.
- Focus is trapped within the LiveArea while it is open (focus trap implementation required — use a lightweight utility or implement manually with `MutationObserver` + `focusin` event capture).

#### 4.4.5 Closing Animation

Reversal of the opening sequence: `280ms` total. LiveArea panel scales from `1.0 → 0.94`, opacity fades to `0`. Simultaneously, bubble grid returns from `opacity: 0.3 → 1.0`. Originating bubble briefly pulses (`scale: 1.0 → 1.08 → 1.0` over 200ms) to confirm the closure action.

---

### 4.5 Audio Integration

#### 4.5.1 Sound Design Requirements

All audio is **subtle, brief, and compositionally light**. The goal is to evoke the Vita's tactile confirmation sounds, not to replicate them (copyright risk). Sounds should be custom-authored or sourced from royalty-free libraries.

| Event | Sound Description | Duration | Volume Level |
|---|---|---|---|
| Bubble hover | Soft high-pitched "blip", 2.5kHz range | ~80ms | 0.25 (of 1.0) |
| Bubble click/focus | Short "confirm" two-tone chime, ascending | ~150ms | 0.4 |
| LiveArea open | Soft "whoosh" + low resonance tone | ~250ms | 0.35 |
| LiveArea close | Descending soft tone | ~180ms | 0.3 |
| START button click | Brighter "launch" chime | ~200ms | 0.45 |
| View toggle activate | Structural "shift" sound — low thud + shimmer | ~300ms | 0.4 |

#### 4.5.2 Audio System Implementation

```typescript
// src/audio/AudioManager.ts

import Howl from 'howler';

const AUDIO_MUTE_KEY = 'portfolio_audio_muted';

interface AudioManagerConfig {
  spriteMap: Record<string, [number, number]>; // [offset_ms, duration_ms]
}

class AudioManager {
  private howl: Howl | null = null;
  private muted: boolean;
  private initialized: boolean = false;

  constructor() {
    this.muted = localStorage.getItem(AUDIO_MUTE_KEY) === 'true';
  }

  // Must be called on first user interaction to satisfy browser autoplay policy
  init(): void {
    if (this.initialized) return;
    this.howl = new Howl({
      src: ['/assets/audio/vita-ui-sounds.webm', '/assets/audio/vita-ui-sounds.mp3'],
      sprite: {
        bubbleHover:    [0,    80],
        bubbleClick:    [200,  150],
        liveareaOpen:   [500,  250],
        liveareaClose:  [850,  180],
        startButton:    [1100, 200],
        viewToggle:     [1400, 300],
      },
      volume: 1.0,
      mute: this.muted,
    });
    this.initialized = true;
  }

  play(soundId: keyof typeof AudioManager.SOUNDS): void {
    if (!this.initialized) this.init();
    if (this.muted || !this.howl) return;
    this.howl.play(soundId);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(AUDIO_MUTE_KEY, String(this.muted));
    if (this.howl) this.howl.mute(this.muted);
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }
}

export const audioManager = new AudioManager();
```

**Audio Sprite File:** All sounds are compiled into a single audio sprite (`vita-ui-sounds.webm` + `.mp3` fallback) to minimize HTTP requests. WebM with Opus codec preferred for smallest file size. Target total sprite duration: under 2 seconds, target file size: under 80KB.

#### 4.5.3 Mute Toggle Button

A persistent mute button is displayed in the Vita View's bottom-right corner, separate from the main view toggle:

```css
.vita-audio-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 191, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: border-color 200ms, background 200ms;
}

.vita-audio-toggle[aria-pressed="true"] {
  /* Muted state */
  opacity: 0.45;
  border-color: rgba(255, 255, 255, 0.15);
}

.vita-audio-toggle:hover {
  background: rgba(0, 0, 0, 0.75);
  border-color: rgba(0, 191, 255, 0.7);
}
```

The button uses `aria-pressed` to communicate mute state to screen readers. Label: `aria-label="Toggle sound effects"`.

---

## 5. THE VIEW SWITCHER TOGGLE MECHANISM

### 5.1 Visual Design

The toggle is a **persistent, always-visible pill-shaped button** that communicates both the current view and the action of switching. It is the single most important persistent UI element in the application. Its design must clearly convey: "You are currently in [X]. Click to switch to [Y]."

**Desktop position:** Fixed in the top-right corner of the viewport, with `right: 24px; top: 20px; z-index: 1000`. When the Professional View's nav bar is visible, the toggle is the rightmost nav element. The two must be vertically aligned.

**Mobile position:** Fixed at `bottom: 24px; left: 50%; transform: translateX(-50%)` — centered at the bottom, where thumbs reach naturally.

#### Visual States

```css
/* src/styles/toggle/ViewToggle.css */

.view-toggle {
  position: fixed;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 8px 10px;
  border-radius: 100px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  white-space: nowrap;
  border: none;
  outline: none;
  transition:
    background 300ms ease,
    box-shadow 300ms ease,
    color 300ms ease;
}

/* When in Professional View (about to switch TO Vita) */
[data-view="professional"] .view-toggle {
  background: #0F0F0E;
  color: #F8F7F4;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  font-family: var(--font-ui);
}

[data-view="professional"] .view-toggle:hover {
  background: #1A3A5C;
  box-shadow: 0 4px 20px rgba(26, 58, 92, 0.4);
}

/* When in Vita View (about to switch TO Professional) */
[data-view="vita"] .view-toggle {
  background: rgba(0, 191, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 191, 255, 0.4);
  box-shadow:
    0 0 16px rgba(0, 191, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.1em;
}

[data-view="vita"] .view-toggle:hover {
  background: rgba(0, 191, 255, 0.25);
  box-shadow:
    0 0 28px rgba(0, 191, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* Icon within the toggle */
.view-toggle__icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-view="professional"] .view-toggle__icon {
  background: rgba(255,255,255,0.1);
}

[data-view="vita"] .view-toggle__icon {
  background: rgba(0, 191, 255, 0.3);
}

/* Rotate icon on toggle */
.view-toggle.is-transitioning .view-toggle__icon {
  transform: rotate(180deg);
}
```

**Toggle Label Logic:**
- In Professional View: Label reads `"PS VITA MODE"` with a small console icon (⊗ or custom SVG).
- In Vita View: Label reads `"PROFESSIONAL VIEW"` with a briefcase icon.

The toggle must never simply say "Switch" or "Toggle" — the label must communicate destination, not action.

### 5.2 Transition Animation Sequence

The full view transition from Professional to Vita (or reverse) must complete in under **400ms** perceived time. The sequence is engineered as follows:

#### Professional → Vita (Total: 360ms)

```typescript
// src/transitions/ViewTransition.ts

export async function transitionToVita(): Promise<void> {
  const professionalRoot = document.getElementById('view-professional')!;
  const vitaRoot = document.getElementById('view-vita')!;

  // Phase 1: 0–120ms — Professional view fades and blurs out
  professionalRoot.style.transition = 'opacity 120ms ease-out, filter 120ms ease-out';
  professionalRoot.style.opacity = '0';
  professionalRoot.style.filter = 'blur(8px)';

  await delay(80); // Vita starts revealing before professional fully hides

  // Phase 2: 80–280ms — Vita view scales in from slight underscale
  vitaRoot.style.display = 'block';
  vitaRoot.style.opacity = '0';
  vitaRoot.style.transform = 'scale(0.96)';
  vitaRoot.style.transition = 'none';

  // Force reflow to ensure transition starts from the set state
  vitaRoot.getBoundingClientRect();

  vitaRoot.style.transition =
    'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
  vitaRoot.style.opacity = '1';
  vitaRoot.style.transform = 'scale(1)';

  await delay(200);

  // Phase 3: 280–360ms — Clean up professional view
  professionalRoot.style.display = 'none';
  professionalRoot.style.opacity = '';
  professionalRoot.style.filter = '';
  professionalRoot.style.transition = '';

  // Commit to localStorage after transition
  ViewState.set('vita');
}
```

**View Transition API (Progressive Enhancement):**

Where `document.startViewTransition()` is supported (Chrome 111+), use it as a progressive enhancement over the manual GSAP/CSS approach:

```typescript
if ('startViewTransition' in document) {
  document.startViewTransition(() => {
    ViewState.set(nextMode);
  });
} else {
  // Fallback to manual CSS/JS transition
  await manualTransition(nextMode);
}
```

Configure the View Transition CSS:
```css
::view-transition-old(root) {
  animation: vtFadeBlurOut 150ms ease-out forwards;
}

::view-transition-new(root) {
  animation: vtScaleFadeIn 280ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes vtFadeBlurOut {
  to { opacity: 0; filter: blur(8px); }
}

@keyframes vtScaleFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
```

### 5.3 Reduced Motion Compliance

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

In the manual fallback path, reduced-motion users receive an instantaneous crossfade (`opacity: 0 → 1` over `16ms` — single frame).

### 5.4 Toggle Accessibility

```html
<button
  class="view-toggle"
  id="view-toggle-btn"
  type="button"
  aria-live="polite"
  aria-label="Switch to PS Vita Mode"
  data-current-view="professional"
>
  <span class="view-toggle__icon" aria-hidden="true">⊗</span>
  <span class="view-toggle__label">PS VITA MODE</span>
</button>
```

The `aria-label` is updated programmatically on toggle:
```typescript
const btn = document.getElementById('view-toggle-btn')!;
btn.setAttribute('aria-label', nextMode === 'vita'
  ? 'Switch to Professional View'
  : 'Switch to PS Vita Mode'
);
```

---

## 6. COMPONENT & DIRECTORY TREE

### 6.1 Full Directory Structure

```
portfolio/
├── index.html                          # Root HTML entry — FOUC script in <head>
├── vite.config.ts                      # Vite configuration
├── tsconfig.json                       # TypeScript config (strict mode enabled)
├── package.json
├── .gitignore
├── .env                                # Environment variables (not committed)
├── .env.example                        # Committed example env file
│
├── public/                             # Static assets — copied as-is to dist/
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── og-image.png                    # 1200×630 Open Graph image
│   ├── robots.txt
│   └── site.webmanifest
│
├── src/
│   ├── main.ts                         # Application entry point
│   │
│   ├── types/
│   │   ├── project.ts                  # ProjectCatalog, Project, and sub-type interfaces
│   │   └── global.d.ts                 # Ambient type declarations (e.g., audio sprite keys)
│   │
│   ├── data/
│   │   └── projects.json               # Single source-of-truth project catalog
│   │
│   ├── state/
│   │   ├── viewState.ts                # ViewMode type, get/set/toggle, CustomEvent dispatch
│   │   └── audioState.ts              # Audio mute state, Howler instance singleton
│   │
│   ├── audio/
│   │   └── AudioManager.ts            # Howler.js wrapper, sprite definitions, play/mute API
│   │
│   ├── transitions/
│   │   └── ViewTransition.ts          # Manual CSS transition + View Transition API paths
│   │
│   ├── utils/
│   │   ├── bubbleAnimProps.ts         # Deterministic animation property generator
│   │   ├── markdown.ts                # Lightweight MD→HTML parser (marked.js wrapper)
│   │   ├── focusTrap.ts               # Focus trap utility for LiveArea modal
│   │   └── delay.ts                   # Promise-based delay helper
│   │
│   ├── components/
│   │   │
│   │   ├── shared/
│   │   │   ├── ViewToggle/
│   │   │   │   ├── ViewToggle.ts      # Toggle button component, aria-label update logic
│   │   │   │   └── ViewToggle.css
│   │   │   └── SkipLink/
│   │   │       ├── SkipLink.ts
│   │   │       └── SkipLink.css
│   │   │
│   │   ├── professional/
│   │   │   ├── ProfessionalView.ts    # Root container, mounts all sub-components
│   │   │   ├── Nav/
│   │   │   │   ├── Nav.ts             # Sticky nav, scroll-aware opacity, active section tracking
│   │   │   │   └── Nav.css
│   │   │   ├── Hero/
│   │   │   │   ├── Hero.ts            # Hero section renderer
│   │   │   │   └── Hero.css
│   │   │   ├── TechMarquee/
│   │   │   │   ├── TechMarquee.ts     # Duplicated list + CSS scroll animation
│   │   │   │   └── TechMarquee.css
│   │   │   ├── FeaturedProject/
│   │   │   │   ├── FeaturedProject.ts # Renders the featured:true project
│   │   │   │   └── FeaturedProject.css
│   │   │   ├── ProjectGrid/
│   │   │   │   ├── ProjectGrid.ts     # CSS Grid of ProjectCard components
│   │   │   │   ├── ProjectCard.ts     # Individual project card
│   │   │   │   └── ProjectGrid.css
│   │   │   ├── Contact/
│   │   │   │   ├── Contact.ts
│   │   │   │   └── Contact.css
│   │   │   └── Footer/
│   │   │       ├── Footer.ts
│   │   │       └── Footer.css
│   │   │
│   │   └── vita/
│   │       ├── VitaView.ts            # Root container, mounts Scroll container + LiveArea
│   │       ├── Background/
│   │       │   ├── VitaBackground.ts  # Injects gradient + SVG wave layers
│   │       │   └── VitaBackground.css
│   │       ├── BubbleGrid/
│   │       │   ├── BubbleGrid.ts      # Renders scroll pages + bubble grids
│   │       │   ├── BubbleGrid.css
│   │       │   ├── Bubble.ts          # Single bubble component, hover + click handlers
│   │       │   └── Bubble.css
│   │       ├── PageIndicator/
│   │       │   ├── PageIndicator.ts   # IntersectionObserver-driven dot indicator
│   │       │   └── PageIndicator.css
│   │       ├── LiveArea/
│   │       │   ├── LiveArea.ts        # Modal container, open/close animation, data population
│   │       │   ├── LiveArea.css
│   │       │   ├── LiveAreaBanner.ts  # Banner + title overlay
│   │       │   ├── LiveAreaStartZone.ts  # START button + code link
│   │       │   └── LiveAreaPanels.ts  # Description, challenges, stack panels
│   │       └── AudioToggle/
│   │           ├── AudioToggle.ts     # Mute button, aria-pressed state
│   │           └── AudioToggle.css
│   │
│   └── styles/
│       ├── global.css                 # CSS reset, custom properties, base elements
│       ├── fonts.css                  # @font-face declarations + preload hints
│       ├── professional/
│       │   └── variables.css          # Professional view CSS custom properties
│       └── vita/
│           └── variables.css          # Vita view CSS custom properties
│
├── assets/                            # Source assets (pre-optimization)
│   ├── vita/
│   │   ├── icons/                     # 512×512 bubble PNG icons, one per project
│   │   ├── banners/                   # 960×544 LiveArea banner images
│   │   └── svg/
│   │       └── wave-pattern.svg       # Animated background SVG wave
│   ├── professional/
│   │   └── cards/                     # 1200×800 project card images (WebP)
│   └── audio/
│       ├── vita-ui-sounds.webm        # Audio sprite (Opus/WebM)
│       └── vita-ui-sounds.mp3         # Audio sprite (MP3 fallback)
│
└── scripts/
    ├── optimize-images.ts             # sharp-based WebP conversion + resize script
    └── generate-audio-sprite.ts       # ffmpeg-based sprite generation from individual files
```

### 6.2 Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split audio library from core bundle — only loaded in Vita view
          'howler': ['howler'],
        }
      }
    }
  },
  css: {
    devSourcemap: true,
  },
  assetsInclude: ['**/*.webm'],
});
```

### 6.3 Component Interface Conventions

All components follow a consistent factory function pattern (no class-based components, no framework lifecycle):

```typescript
// Convention: every component file exports a mount function
// that accepts a container element and returns a cleanup function.

export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;
}

// Example:
export function createBubbleGrid(projects: Project[]): ComponentInstance {
  let bubbles: HTMLElement[] = [];

  return {
    mount(container) {
      // render DOM, attach event listeners
    },
    destroy() {
      // remove event listeners, free audio references
      bubbles = [];
    }
  };
}
```

The `destroy()` method is mandatory on all components and called during view transitions to prevent memory leaks from lingering event listeners on detached DOM nodes.

### 6.4 CSS Architecture Rules

1. **No global class name collisions.** Prefix all professional view classes with `.pro-` and all Vita view classes with `.vita-`. Shared components use `.shared-`.
2. **Custom properties are view-scoped.** All custom properties are declared under `[data-view="professional"]` or `[data-view="vita"]` selectors on `:root`. A component never hard-codes color or spacing values directly — it always references a custom property.
3. **No `!important`.** If specificity conflicts arise, fix the selector structure.
4. **Layer ordering.** Use `@layer` to enforce cascade order:
   ```css
   @layer reset, base, variables, components, utilities;
   ```
5. **Critical CSS.** The Professional View's above-the-fold styles (nav, hero) are inlined in `<style>` in `index.html` during build via Vite plugin to further reduce LCP latency.

---

*End of Master Design Document v1.0*

---

**Document Maintenance:** This document is the authoritative specification. All implementation deviations require updating this document before merging to the main branch. Pull requests that modify component structure, data schema, or transition behavior without corresponding MDD updates will be rejected at review.
