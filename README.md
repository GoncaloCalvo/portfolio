# Portfolio — Dual-Design

A personal developer portfolio with **two completely distinct experiences** controlled by a single persistent toggle:

1. **Professional Executive View** — refined editorial minimalism aimed at recruiters and hiring managers.
2. **PS Vita Immersive View** — a pixel-faithful, interactive recreation of the PS Vita XMB / LiveArea interface, complete with floating bubbles, a peel-to-dismiss gesture, and authentic UI sounds.

Built **framework-free** — vanilla TypeScript + Vite, no React/Vue/Svelte and no state-management library.

**Live:** https://goncalocalvo.github.io/portfolio/

---

## Highlights

- **Zero-flash view switching** — a synchronous inline script sets `[data-view]` before CSS parses, so the correct view paints from frame zero (no FOUC).
- **Two views, one DOM, no leakage** — strict `.pro-` / `.vita-` class prefixes, view-scoped CSS custom properties, and `@layer` ordering keep the two designs fully isolated.
- **Sub-400ms transitions** — View Transition API where supported (Chrome 111+), with a `requestAnimationFrame` opacity/scale fallback everywhere else.
- **Accessible** — WCAG AA contrast, focus management + focus trap on the LiveArea dialog, full keyboard navigation, `prefers-reduced-motion` honored throughout.
- **Tuned for Core Web Vitals** — LCP < 1.2s, CLS 0.00 (fixed image/bubble dimensions), audio lazy-initialized on first interaction.

## Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 5 |
| Language | TypeScript 5 (strict) |
| Styling | Plain CSS — `@layer` + custom properties |
| Audio | Howler.js (sprite, lazy-loaded, Vita view only) |
| Deploy | GitHub Pages via GitHub Actions |

## Local Development

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

Image assets are optimized from `assets/` into `public/assets/` (spec-compliant WebP) with:

```bash
npm run optimize:images
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which type-checks, builds with
`VITE_BASE_PATH=/portfolio/` (the GitHub Pages project subdirectory), and publishes `dist/`
to GitHub Pages. Pages source must be set to **GitHub Actions** in the repo settings.
