# Project Brief: Timbre Voice Changer

| Field | Value |
|---|---|
| **id** | `timbre-voice-changer` |
| **title** | Timbre Voice Changer |
| **subtitle** | Real-time desktop voice changer that routes effects into Discord and games |
| **completedAt** | 2026-06-27 |
| **featured** | `false` |

## Description

A free Windows desktop voice changer in the spirit of Voicemod, built as a portfolio
piece optimised to show off **polished UI/UX**. It captures the microphone, applies
real-time effects through a Web Audio graph, and fans the processed signal out to two
destinations at once: a **monitor** output so you hear yourself, and a **virtual cable**
output so other people in Discord or a game hear the transformed voice. It also ships a
soundboard and clip recording.

The stack is Electron + React + TypeScript with all audio handled in the renderer via the
Web Audio API, using an `AudioWorklet` for custom DSP and a pitch-shift library rather
than a hand-rolled phase vocoder — character effects don't need studio quality, so the
design accepts some artifacts in exchange for shipping. Routing into other apps depends on
the user installing VB-CABLE; the app detects it and guides setup rather than pretending
to bundle a kernel-mode driver. That honesty is deliberate: of the four features, routing
is the only one that is genuinely hard and has zero UI surface, so the portfolio value
lives in the monitoring, the effects and voice picker, the soundboard, and the polish
pass — level meters, spectrum visualisation, theming, and considered empty and error
states.

## Technical Challenges

### 1. Routing into other apps without writing a driver

Letting Discord and games hear the processed voice normally means authoring and signing a
kernel-mode audio driver — months of work, invisible to the UI, and out of scope. Instead
the app fans the single processed node into two `MediaStreamAudioDestination` nodes: one
`<audio>` element monitors to the speakers, the other targets the VB-CABLE input via
`setSinkId`, and the user points their app's mic at the CABLE output. The app enumerates
devices on launch, detects whether a CABLE device is present, and shows a guided
onboarding screen with a re-check button when it is absent rather than failing silently.

### 2. A data-driven effects engine, not hard-coded presets

Hard-coding each voice would make every new effect a code change. Instead a voice is just
data: a named preset is an ordered list of effect nodes plus parameters, stored as JSON,
and the engine builds the corresponding Web Audio graph from it. Pitch shift,
ring-modulation robot, delay-and-feedback echo, convolver reverb, waveshaper distortion,
and bandpass telephone are each one node type the renderer knows how to instantiate, so
composed voices like Monster (pitch down + distortion + reverb) and a build-your-own-voice
UI fall out of the same model for free.

### 3. Keeping monitoring latency low enough to be usable

Hearing yourself with lag is unpleasant, and Web Audio plus an AudioWorklet adds roughly
10–30 ms of round-trip latency. The processing chain is kept on the audio thread in a
single worklet pass to stay at the low end of that range, and monitoring is tested early
as a first-class concern rather than assumed acceptable, since a laggy monitor undermines
the whole tactile feel of the app.

### 4. A soundboard and recording that share the same routed output

Soundboard pads and recorded clips have to reach the same listeners as the live voice, so
their players mix into the cable destination alongside the effects chain (and optionally
into the monitor). Clips are captured off the processed stream with `MediaRecorder` and
saved to disk through Electron's `dialog` and `fs`, so recording reuses the existing graph
instead of standing up a second audio path.

## Tech Stack

```json
["TypeScript", "Electron", "React", "Web Audio API", "AudioWorklet", "Tone.js", "MediaRecorder", "VB-CABLE"]
```

## Links

| Link | URL |
|---|---|
| `repository` | https://github.com/GoncaloCalvo/timbre |
| `liveApp` | *(n/a — desktop app; add a release/download URL once published)* |
