# projectMDDs/ — Project Briefs

This folder contains **one markdown brief per portfolio project**. Each brief is the
source material used when populating `src/data/projects.json` — the single
source-of-truth catalog consumed by both the Professional and Vita views
(schema: `src/types/project.ts`).

Briefs are written for human review, then transcribed into the JSON catalog.
They are **not** loaded by the application at runtime.

## Required contents per brief

| Field | Constraint |
|---|---|
| `id` | URL-safe lowercase slug, e.g. `signal-judgment-trader` |
| `title` | Display title, max 40 characters |
| `subtitle` | One-line tagline, **max 80 characters** |
| `description` | Full description, markdown. Honest and technical — no marketing fluff. |
| `technicalChallenges` | 2–4 entries, each with a short `title` and a 2–4 sentence `description` |
| `techStack` | Array of technology strings, primary technologies first |
| `links` | `repository` (required), `liveApp` / `caseStudyUrl` (optional) |
| `completedAt` | ISO 8601 date of completion or last major update |
| `featured` | `true` for at most one project (rendered in the Professional hero position) |

## Workflow

1. Write or update a brief here, derived from the project's own design docs / results.
2. Review the brief (content accuracy, subtitle length, challenge framing).
3. Transcribe into `src/data/projects.json`, assigning `displayOrder` and `assets`