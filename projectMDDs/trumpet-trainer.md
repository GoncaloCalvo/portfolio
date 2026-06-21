# Project Brief: Trumpet Trainer

| Field | Value |
|---|---|
| **id** | `trumpet-trainer` |
| **title** | Trumpet Trainer |
| **subtitle** | Sheet-music practice tool that gates playhead progress on correct mic pitch |
| **completedAt** | 2026-06-21 |
| **featured** | `false` |

## Description

A browser-based practice tool for trumpet and other monophonic instruments. It
renders sheet music, runs a playhead across the score at a chosen tempo, listens to
the microphone, and **gates progress on correct pitch**: when the played note doesn't
match the note under the playhead, the playhead holds on that note or rewinds to the
start of the bar, so you can't advance until you play it right. The goal is enforced,
focused practice rather than passive play-along.

All real-time audio and rendering is client-side. Mic capture and pitch detection run
in an AudioWorklet off the main thread, MusicXML is parsed into an ordered note model,
and OpenSheetMusicDisplay drives the scrolling score and its cursor. A small Python
backend handles optional accounts, file storage, the bundled public-domain score
library, and best-effort optical music recognition (PDF/image → MusicXML via
Audiveris) that the user confirms before practicing. Raw microphone audio never leaves
the device, and only derived session stats (accuracy, longest streak, most-missed notes)
are persisted.

## Technical Challenges

### 1. Real-time monophonic pitch detection off the main thread

Mic-to-feedback has to feel instant (under ~100 ms perceived) or the gating feels
laggy and wrong. Capture and analysis run in a Web Audio AudioWorklet on a rolling
buffer, off the main thread, using a YIN/autocorrelation detector suited to
monophonic signals. The detector emits `{ note, cents, confidence }`; a confidence
gate rejects silence and noise before any matching happens, and a minimum-sustain
debounce rejects transients so a brief overshoot on the way to the target note
doesn't count as a hit.

### 2. The pitch-gated playhead: hold and rewind

The core mechanic is a scheduler that advances the playhead by tempo, a matcher that
compares detected vs. expected pitch, and a gating controller that turns match
results into playhead motion. A note counts as correct only when the detected MIDI
note matches the expected one at the exact octave, within a user-set cents tolerance,
sustained past the debounce, and inside a rough timing window around the scheduled
beat. On a miss, **hold** mode re-arms matching on the same note while **rewind** mode
jumps back to the start of the current bar. Gating mode is selectable per session.

### 3. Bb transposition as a single transform point

A trumpet reading a written C sounds a concert Bb, so the mic hears a pitch a major
second below the written note. Rather than transposing the score, the note model
stores written pitch and the matcher applies the offset at comparison time: toggle ON
maps the expected note down two semitones before matching, toggle OFF compares written
pitch directly. Keeping the transform in one place in the matcher means the toggle can
flip mid-session without re-parsing, and other transposing instruments drop in later by
changing only the offset.

### 4. Optical music recognition you have to confirm

Users can upload `.musicxml`/`.xml`/`.mxl` directly, but they can also upload a PDF or
image, which a backend Audiveris job (a Java subprocess driven from the Python API)
converts to MusicXML asynchronously. OMR is never assumed perfect: results come back
marked **unverified** and are shown in the renderer for the user to confirm or discard
before practicing, with the expectation set up front that clean engraved scores work
best and handwritten or low-resolution scans may fail. Unsupported MusicXML features
degrade gracefully, skipped with a warning rather than crashing the renderer.

## Tech Stack

```json
["TypeScript", "Web Audio API", "AudioWorklet", "OpenSheetMusicDisplay", "Vite", "Python", "music21", "Audiveris", "PostgreSQL"]
```

## Links

| Link | URL |
|---|---|
| `repository` | https://github.com/GoncaloCalvo/trumpet-trainer |
| `liveApp` | *(optional; add the deployment URL once hosted)* |
