# CLAUDE.md — Agent Memory & Code Style Ledger
## Dual-Design Portfolio — Vite + TypeScript + Vanilla DOM

> **Purpose:** This file is the authoritative guide for every future Claude session on this
> project. Read it in full before writing any code. Update it whenever architectural decisions
> change. It is the single contract between human engineers and the AI agent.

---

## Project Overview

A dual-view portfolio website with two entirely distinct experiences controlled by a single
persistent toggle:

1. **Professional Executive View** — Refined editorial minimalism targeting technical
   recruiters and hiring managers. Think high-end consultancy case study publication.
2. **PS Vita Immersive View** — Precise functional recreation of the PS Vita XMB/LiveArea
   interface. Not a passing aesthetic — a rigorously executed interactive system.

**Authoritative spec:** `MASTER_DESIGN_DOCUMENT.md` — read it before implementing any feature.

---

## Tech Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Build | Vite | 5.x |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Plain CSS (Layers + Custom Properties) | — |
| Audio | Howler.js | 2.x |
| Fonts | Google Fonts (Instrument Serif, DM Mono, Geist, Rajdhani, DM Sans) | — |
| Deployment | GitHub Pages (Actions CI/CD) | — |

**Explicitly rejected:** React, Vue, Svelte, Next.js, jQuery, Redux, any state management lib,
CSS-in-JS, Webpack, CRA.

---

## Critical: FOUC Prevention

The inline `<script>` in `index.html <head>` **MUST remain the first element** in `<head>`,
before any `<link>` or `<style>`. It sets `[data-view]` on `<html>` synchronously so the CSSOM
is constructed with the correct view visible from frame zero. Never move, defer, or remove it.

```html
<script>
  (function() {
    var mode = localStorage.getItem('portfolio_view_mode') || 'professional';
    document.documentElement.setAttribute('data-view', mode);
  })();
</script>
```

---

## State Architecture

- View state: a single `'professional' | 'vita'` string in `localStorage` under key
  `portfolio_view_mode`. Source of truth: `src/state/viewState.ts`.
- Audio mute state: `portfolio_audio_muted` in localStorage. Managed by `src/audio/AudioManager.ts`,
  re-exported via `src/state/audioState.ts`.
- No external state management library ever.
- Component communication via `window.dispatchEvent(new CustomEvent('viewchange', ...))`.

---

## Component Interface Convention (MANDATORY)

Every component file **must** export a factory function returning this interface:

```typescript
export interface ComponentInstance {
  mount(container: HTMLElement): void;
  destroy(): void;  // Remove event listeners, free references. Called on every view transition.
}
```

- No class-based components.
- No framework lifecycle methods.
- `destroy()` is **not optional** — omitting it causes memory leaks during view transitions.

---

## CSS Architecture Rules (§6.4 of spec)

1. **Class prefixes are mandatory:** `.pro-` for Professional view, `.vita-` for Vita view,
   `.shared-` for components used in both views.
2. **Custom properties are view-scoped.** Declared exclusively under
   `[data-view="professional"]` or `[data-view="vita"]` on `:root`. Components never
   hard-code colour, spacing, or font values — only CSS custom property references.
3. **No `!important`.** Resolve specificity conflicts by fixing the selector or using `@layer`.
4. **Layer order** (declared in `src/styles/global.css`):
   ```css
   @layer reset, base, variables, components, utilities;
   ```
   `utilities` is the highest-priority layer and is where reduced-motion overrides live.
5. **`@keyframes` are declared outside `@layer` blocks** to avoid browser compat issues with
   layer-scoped keyframe resolution.

---

## CSS File Responsibilities

| File | Contents |
|---|---|
| `src/styles/global.css` | Layer order declaration, reset, base doc styles, view visibility rules, skip link, View Transition API keyframes, reduced-motion overrides |
| `src/styles/fonts.css` | Font-feature-settings, rendering hints. Actual font `<link>` tags are in `index.html`. |
| `src/styles/professional/variables.css` | All Professional view CSS custom properties (typography, colours, layout, transitions) |
| `src/styles/vita/variables.css` | All Vita view CSS custom properties (colours, bubble animation defaults, LiveArea dims, transitions) |

---

## Data Architecture

- Single source of truth: `src/data/projects.json`
- TypeScript schema: `src/types/project.ts` (interfaces `Project`, `ProjectCatalog`, etc.)
- **Both views consume identical data.** No view-specific data files — ever.
- Asset paths use absolute URLs from root (e.g., `/assets/vita/icons/...`) because they are
  served from `public/`.

### Asset Dimensions (hard requirements)

| Field | Dimensions | Format | Max Size |
|---|---|---|---|
| `vitaBubbleIcon` | 512×512 px | PNG (transparent bg) | 150 KB |
| `vitaLiveAreaBanner` | 960×544 px | PNG or WebP | 400 KB |
| `professionalCardImage` | 1200×800 px | WebP preferred | 300 KB |

---

## Typography

### Professional View
- Display: `--font-display` → `Instrument Serif` — headlines, hero name
- Mono: `--font-mono` → `DM Mono` — code, technical metadata
- UI: `--font-ui` → `Geist` — navigation labels, buttons

### Vita View
- UI: `--font-vita-ui` → `Rajdhani` — all Vita UI chrome (closest free approx to PS Vita font)
- Body: `--font-vita-body` → `DM Sans` — LiveArea panel text

---

## Build Configuration Notes

- **Target:** `ES2020`
- **CSS minifier:** `lightningcss` (requires `lightningcss` npm package — already installed)
- **Manual chunk:** `howler` is split from the core bundle. It is only loaded in the Vita view.
- **`assetsInclude: ['**/*.webm']`** — treats WebM files as importable assets.
- **`VITE_BASE_PATH`** env var controls the `base` for GitHub Pages subdirectory deployment.

---

## Accessibility Requirements (WCAG AA)

- Document structure: one `<h1>` (hero name), `<h2>` section headers, `<h3>` project cards.
- All interactive elements: `focus-visible` outline — `2px solid var(--color-accent-primary)`,
  `outline-offset: 3px`.
- All images: meaningful `alt` attribute sourced from `assets.imageAlt` in project data.
- WCAG AA minimum contrast: ≥ 4.5:1 for all body text.
- Nav: `<nav aria-label="Primary navigation">`.
- Skip link: first focusable element → `<a href="#main-content">`.
- Vita bubble grid: `role="list"` on container, `role="listitem"` on each bubble.
- LiveArea: `role="dialog"`, `aria-modal="true"`, focus trap required (WCAG 2.1 §2.1.2).
- Audio toggle: `aria-pressed` communicates mute state.
- `prefers-reduced-motion`: all animations must be disabled or reduced. Handled in `@layer utilities`.

---

## Core Web Vitals Targets

| Metric | Target | Key Constraint |
|---|---|---|
| LCP | < 1.2s | Hero content inline; Instrument Serif preloaded |
| CLS | 0.00 | Fixed dimensions on all images and bubble containers |
| INP | < 100ms | Event handlers debounced; transitions use `requestAnimationFrame` |
| FID | < 50ms | No synchronous main-thread blocking; audio lazy-init on first pointer interaction |

---

## Audio Sprite Layout

File: `public/assets/audio/vita-ui-sounds.webm` (+ `.mp3` fallback)

| Key | Offset (ms) | Duration (ms) | Volume |
|---|---|---|---|
| `bubbleHover` | 0 | 80 | 0.25 |
| `bubbleClick` | 200 | 150 | 0.40 |
| `liveareaOpen` | 500 | 250 | 0.35 |
| `liveareaClose` | 850 | 180 | 0.30 |
| `startButton` | 1100 | 200 | 0.45 |
| `viewToggle` | 1400 | 300 | 0.40 |

Audio **must** lazy-initialize on first user interaction (browser autoplay policy).
`AudioManager.init()` is called automatically by the first `play()` invocation.

---

## View Toggle Design

- **Professional → Vita label:** "PS VITA MODE" with ⊗ icon
- **Vita → Professional label:** "PROFESSIONAL VIEW" with briefcase icon
- The label communicates **destination**, never just "Toggle" or "Switch".
- `aria-label` updated programmatically on each toggle.
- Desktop: fixed `top: 20px; right: 24px; z-index: 1000`.
- Mobile: fixed `bottom: 24px; left: 50%; transform: translateX(-50%)`.

---

## View Transition Timing

| Phase | Duration | Effect |
|---|---|---|
| Professional fade-out | 0–120ms | opacity 0, filter blur(8px) |
| Vita scale-in | 80–280ms | opacity 0→1, scale 0.96→1.0 |
| Cleanup | 280–360ms | Remove professional from DOM flow |

Total perceived time: < 400ms. Use View Transition API (`document.startViewTransition`) where
supported (Chrome 111+) with manual CSS fallback for other browsers.

---

## Directory Notes

- `assets/` — Source assets (unoptimized). Processed by scripts in `scripts/` using sharp (images) and ffmpeg (audio).
- `public/assets/` — Production-ready static assets, accessible at `/assets/` URL path.
- `scripts/optimize-images.ts` — sharp-based WebP conversion + resize. Run via `npm run optimize:images`.
- `scripts/generate-audio-sprite.ts` — ffmpeg-based sprite generation script (implemented Phase 5).

---

## Phase Completion Tracker

- [x] **Phase 1** — Environment, Tooling, Build Config, Global CSS, Agent Memory Setup
- [x] **Phase 2** — Global State & Gateways: ViewState bridge, `delay.ts` utility, `ViewTransition.ts` (View Transition API + manual CSS fallback + reduced-motion), `ViewToggle` persistent component, `main.ts` integration
- [x] **Phase 3** — Professional View components (Nav, Hero, TechMarquee, FeaturedProject, ProjectGrid, Contact, Footer)
- [x] **Phase 4** — Vita View components (Background, BubbleGrid, LiveArea, PageIndicator, AudioToggle)
- [x] **Phase 5** — Audio integration (Howler sprite setup, per-sprite volumes, audio triggers on all Vita + ViewToggle interactions)
- [x] **Phase 6** — Accessibility audit (WCAG AA, focus management, ARIA, keyboard navigation)
- [x] **Phase 7** — Performance optimization (image pipeline, font LCP split, CLS-safe img markup, bundle verification)
- [x] **Phase 8** — Deployment configuration (GitHub Pages CI/CD via `.github/workflows/deploy.yml`, `VITE_BASE_PATH=/dual-design-portfolio/`, `upload-pages-artifact@v3` + `deploy-pages@v4`)
