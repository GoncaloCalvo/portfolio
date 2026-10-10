# Project Brief: Rumorsmith

| Field | Value |
|---|---|
| **id** | `rumorsmith` |
| **title** | Rumorsmith |
| **subtitle** | A browser puzzle game about routing a rumor through villagers who garble it |
| **completedAt** | 2026-10-09 |
| **featured** | `false` |

## Description

A browser puzzle game, released free on itch.io, about passing a rumor around a village.
Each village is a graph of villagers. You whisper a rumor to one of them and route it,
one whisper at a time, until a target villager hears an **exact** sentence. Everyone
changes it on the way: the Exaggerator climbs a ladder (`CRUMB → BREAD → CAKE → GOLD`),
the Mishearer swaps a sound-alike (`BAKER → MAKER`), the Contrarian flips verbs
(`STOLE ↔ RETURNED`), the Forgetful turns the first noun into `SOMEONE`, and so on
through ten personalities. Each villager hears the rumor once, some must not hear it at
all, and some lanes only run one way.

It ships 60 handmade levels across 9 villages, a Daily Rumor that is the same for every
player with a spoiler-free share result and a streak, and endless generated villages at
three difficulties. Every level, daily and generated village is proven solvable by a
built-in solver before a player sees it, and par is the solver's answer rather than a
guess.

The game is plain TypeScript with DOM and SVG rendering, no engine, built with Vite. The
game rules live in a pure core with no DOM, so the personalities, the rules, the solver
and the generator are all unit tested with Vitest, and a Playwright script plays all 60
levels through the real UI. The look is an illuminated manuscript: generated vellum, ink
linework, public-domain engraved portraits, and one vermilion accent kept for the
rumor's corrections. All sound is procedural Web Audio. It is mobile-first, works with
touch, mouse or keyboard, makes no network requests at runtime, and saves progress
locally with a code to carry it to another device.

## Technical Challenges

### 1. A solver that sets par and rejects trivial levels

`solve()` is a uniform-cost search over game states: who has heard the rumor, plus which
villagers can still speak and what they heard. Each whisper costs one and a Gossip fork
costs two, and speakers with nobody left to talk to are dropped from the state key so
equivalent positions merge. It returns par, one optimal route and the number of optimal
routes. `analyzeLevel()` then re-solves with each featured personality removed and with
only plain relays allowed, flagging levels that can be beaten without the mechanic they
are meant to teach. The test suite asserts every shipped level is solvable, unflagged,
and has a recorded par equal to the solver's.

### 2. Generated puzzles that are proven before they are shown

The Daily Rumor and the endless villages are generated from a seeded PRNG: a jittered
grid of villagers, lanes between grid neighbours, random personalities and a rumor.
Each candidate is only accepted if the map is readable (spacing, no lanes through
villagers, no crossings), the solver proves it solvable with no trivial flags, par falls
in the difficulty's range, and enough word-changing personalities sit on the optimal
route. Otherwise the generator retries deterministic sub-seeds, so the same date or seed
always gives the same puzzle.

### 3. Changing the generator without changing past dailies

New words and personalities had to reach the daily puzzle without altering any puzzle a
player had already seen, shared or kept a streak on. The original generator is kept
exactly as it was for every date before the cut-over, and the new one only applies from
then on, with new random draws added in a way that leaves the old sequence untouched. A
test fingerprints every past daily against a stored fixture, so any change that shifts
an old puzzle fails the suite.

### 4. Teaching the rules without text walls

Ten personalities is a lot of rules for a short casual game. The first time a
personality appears, that villager mutters their trick and shows it on the opening
rumor. Pressing and holding a villager previews what they would pass on without
committing, the goal sentence inks in word by word as the rumor gets closer, and a
two-step hint first names which personalities the rest of the route needs before it
gives the move. Personalities are told apart by emblem shape alone, so the game stays
readable for colour-blind players.

## Tech Stack

TypeScript, Vite, SVG, Web Audio API, Vitest, Playwright

## Links

- **repository:** none (private repository)
- **liveApp:** https://jopiraca.itch.io/rumorsmith (label: "Play on itch.io")
