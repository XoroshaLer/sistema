// Turns source photos into the app's hero images: square crop, muted colour,
// a cold steel-blue tone to match the theme, small WebP files.
// Usage: node scripts/process-photos.mjs <source-dir> <output-dir>
// Expects day-a.jpg … day-d.jpg in the source dir.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('Usage: node scripts/process-photos.mjs <source-dir> <output-dir>');
  process.exit(1);
}

const SIZE = 640;
// Vertical focus of the crop, 0 = top, 1 = bottom.
const FOCUS = { 'day-a': 0.5, 'day-b': 0.45, 'day-c': 0.5, 'day-d': 0.3 };

mkdirSync(out, { recursive: true });
const tone = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 29, g: 61, b: 94, alpha: 0.38 } } }).png().toBuffer();

for (const [name, focus] of Object.entries(FOCUS)) {
  const input = sharp(join(src, `${name}.jpg`));
  const { width, height } = await input.metadata();
  const scale = SIZE / Math.min(width, height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const left = Math.round((w - SIZE) / 2);
  const top = Math.round((h - SIZE) * focus);
  await input
    .resize(w, h)
    .extract({ left, top, width: SIZE, height: SIZE })
    .modulate({ saturation: 0.4, brightness: 0.82 })
    .composite([{ input: tone, blend: 'overlay' }])
    .webp({ quality: 72 })
    .toFile(join(out, `${name}.webp`));
  console.log(`${name}.webp`);
}
