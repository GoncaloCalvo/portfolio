/**
 * generate-audio-sprite.ts
 *
 * Compiles individual sound source files into a single audio sprite for the Vita UI.
 * Output: public/assets/audio/vita-ui-sounds.webm (primary) and .mp3 (fallback)
 *
 * Sprite layout (must match SPRITE_MAP in src/audio/AudioManager.ts):
 *   bubbleHover    offset=0ms     duration=80ms   gap=120ms → next at 200ms
 *   bubbleClick    offset=200ms   duration=150ms  gap=150ms → next at 500ms
 *   liveareaOpen   offset=500ms   duration=250ms  gap=100ms → next at 850ms
 *   liveareaClose  offset=850ms   duration=180ms  gap=70ms  → next at 1100ms
 *   startButton    offset=1100ms  duration=200ms  gap=100ms → next at 1400ms
 *   viewToggle     offset=1400ms  duration=300ms
 *   Total sprite duration: ~1700ms
 *
 * Prerequisites:
 *   - ffmpeg available on PATH
 *   - Source files placed in assets/audio/src/ with the names below
 *
 * Usage:
 *   npx tsx scripts/generate-audio-sprite.ts
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const SRC_DIR = join(ROOT, 'assets', 'audio', 'src');
const OUT_DIR = join(ROOT, 'public', 'assets', 'audio');

// Each entry: [sourceFile, offsetMs, durationMs, silenceAfterMs]
// silenceAfterMs pads the end of each clip so the next clip starts at the right offset.
const CLIPS: Array<{ file: string; offsetMs: number; durationMs: number; silenceAfterMs: number }> = [
  { file: 'bubble-hover.wav',    offsetMs: 0,    durationMs: 80,  silenceAfterMs: 120 },
  { file: 'bubble-click.wav',    offsetMs: 200,  durationMs: 150, silenceAfterMs: 150 },
  { file: 'livearea-open.wav',   offsetMs: 500,  durationMs: 250, silenceAfterMs: 100 },
  { file: 'livearea-close.wav',  offsetMs: 850,  durationMs: 180, silenceAfterMs: 70  },
  { file: 'start-button.wav',    offsetMs: 1100, durationMs: 200, silenceAfterMs: 100 },
  { file: 'view-toggle.wav',     offsetMs: 1400, durationMs: 300, silenceAfterMs: 0   },
];

function run(cmd: string): void {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function msToSec(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function main(): void {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // Verify all source files exist before starting.
  for (const clip of CLIPS) {
    const srcPath = join(SRC_DIR, clip.file);
    if (!existsSync(srcPath)) {
      console.error(`Missing source file: ${srcPath}`);
      process.exit(1);
    }
  }

  // Build a concat filter that trims each clip to its exact duration and appends silence.
  // ffmpeg complex filter: [0:a]atrim=duration=X,apad=whole_dur=Y[c0];...;[c0][c1]...concat=n=N:v=0:a=1
  const inputArgs = CLIPS.map(c => `-i "${join(SRC_DIR, c.file)}"`).join(' ');
  const filterParts: string[] = [];
  const outputLabels: string[] = [];

  CLIPS.forEach((clip, i) => {
    const clipSec = msToSec(clip.durationMs);
    const totalSec = msToSec(clip.durationMs + clip.silenceAfterMs);
    // Trim to exact duration, then pad with silence to reach the target offset gap.
    filterParts.push(`[${i}:a]atrim=duration=${clipSec},apad=whole_dur=${totalSec}[c${i}]`);
    outputLabels.push(`[c${i}]`);
  });

  const concatFilter = `${filterParts.join(';')};${outputLabels.join('')}concat=n=${CLIPS.length}:v=0:a=1[out]`;
  const filterArg = `"${concatFilter}"`;

  const webmOut = join(OUT_DIR, 'vita-ui-sounds.webm');
  const mp3Out  = join(OUT_DIR, 'vita-ui-sounds.mp3');

  // WebM/Opus — primary format (~40–60KB target)
  run(
    `ffmpeg -y ${inputArgs} -filter_complex ${filterArg} -map "[out]" ` +
    `-c:a libopus -b:a 64k -ar 48000 "${webmOut}"`
  );

  // MP3 fallback (~80KB target)
  run(
    `ffmpeg -y ${inputArgs} -filter_complex ${filterArg} -map "[out]" ` +
    `-c:a libmp3lame -b:a 128k -ar 44100 "${mp3Out}"`
  );

  console.log('\nAudio sprite generation complete:');
  console.log(`  WebM: ${webmOut}`);
  console.log(`  MP3:  ${mp3Out}`);
  console.log('\nVerify sprite offsets match SPRITE_MAP in src/audio/AudioManager.ts');
}

main();
