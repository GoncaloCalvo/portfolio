/**
 * optimize-images.ts — Phase 7 image optimization pipeline.
 *
 * Processes source images from assets/ into compressed production assets in public/assets/.
 * Enforces the strict dimension caps from MASTER_DESIGN_DOCUMENT §2.3.
 *
 *   Vita Bubble Icons    assets/vita/icons/**         → public/assets/vita/icons/    (512×512, WebP lossless)
 *   Vita LiveArea Banners assets/vita/banners/**      → public/assets/vita/banners/  (960×544, WebP cover-crop)
 *   Professional Cards   assets/professional/cards/** → public/assets/professional/  (max 1200×800, WebP)
 *
 * Usage:
 *   npm run optimize:images
 *   npx tsx scripts/optimize-images.ts
 */

import sharp from 'sharp';
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const RASTER_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.bmp']);

type FitMode = 'inside' | 'cover' | 'contain';

interface Job {
  label: string;
  srcDir: string;
  outDir: string;
  width: number;
  height: number;
  fit: FitMode;
  format: 'webp' | 'png';
  quality?: number;
  lossless?: boolean;
  maxSizeBytes: number;
}

const JOBS: Job[] = [
  {
    label: 'Vita Bubble Icons',
    srcDir: 'assets/vita/icons',
    outDir: 'public/assets/vita/icons',
    width: 512,
    height: 512,
    fit: 'inside',
    format: 'webp',
    lossless: true,
    maxSizeBytes: 150 * 1024,
  },
  {
    label: 'Vita LiveArea Banners',
    srcDir: 'assets/vita/banners',
    outDir: 'public/assets/vita/banners',
    width: 960,
    height: 544,
    fit: 'cover',
    format: 'webp',
    quality: 85,
    maxSizeBytes: 400 * 1024,
  },
  {
    label: 'Professional Card Images',
    srcDir: 'assets/professional/cards',
    outDir: 'public/assets/professional',
    width: 1200,
    height: 800,
    fit: 'inside',
    format: 'webp',
    quality: 82,
    maxSizeBytes: 300 * 1024,
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function processJob(job: Job): Promise<void> {
  const srcAbs = path.join(ROOT, job.srcDir);
  const outAbs = path.join(ROOT, job.outDir);

  console.log(`\n[${job.label}]`);
  console.log(`  Source : ${job.srcDir}`);
  console.log(`  Output : ${job.outDir}`);
  console.log(`  Bounds : ${job.width}×${job.height}px  fit=${job.fit}`);

  if (!existsSync(srcAbs)) {
    console.log('  ⚠  Source directory not found — skipping.');
    return;
  }

  const entries = await readdir(srcAbs);
  const imageFiles = entries.filter(f =>
    RASTER_EXTS.has(path.extname(f).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.log('  ⚠  No image files found — skipping.');
    return;
  }

  await mkdir(outAbs, { recursive: true });

  let ok = 0;
  let failed = 0;

  for (const file of imageFiles) {
    const srcPath = path.join(srcAbs, file);
    const baseName = path.parse(file).name;
    const outPath = path.join(outAbs, `${baseName}.${job.format}`);

    try {
      const pipeline = sharp(srcPath).resize({
        width: job.width,
        height: job.height,
        fit: job.fit,
        withoutEnlargement: true,
        position: 'center',
      });

      const outputBuffer: Buffer =
        job.format === 'webp'
          ? await pipeline
              .webp(
                job.lossless
                  ? { lossless: true }
                  : { quality: job.quality ?? 82, effort: 5 }
              )
              .toBuffer()
          : await pipeline
              .png({ compressionLevel: 9, adaptiveFiltering: true })
              .toBuffer();

      const { size: inputSize } = await stat(srcPath);
      const ratio = ((1 - outputBuffer.length / inputSize) * 100).toFixed(1);

      if (outputBuffer.length > job.maxSizeBytes) {
        console.warn(
          `  ⚠  ${baseName}.${job.format}: ${formatBytes(outputBuffer.length)} ` +
          `exceeds ${formatBytes(job.maxSizeBytes)} spec limit`
        );
      }

      await writeFile(outPath, outputBuffer);

      console.log(
        `  ✓  ${file.padEnd(32)} ${formatBytes(inputSize)} → ` +
        `${formatBytes(outputBuffer.length)} (−${ratio}%)`
      );
      ok++;
    } catch (err) {
      console.error(`  ✗  ${file}:`, (err as Error).message);
      failed++;
    }
  }

  console.log(`  — ${ok} processed, ${failed} failed`);
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Dual-Design Portfolio — Image Optimization Pipeline ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`Root: ${ROOT}\n`);

  for (const job of JOBS) {
    await processJob(job);
  }

  console.log('\n✓ All jobs complete.');
  console.log('  Verify output paths match asset references in src/data/projects.json.');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
