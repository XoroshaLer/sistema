// Renders the app icons into public/. Run once with `npm run icons`.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E1319"/>
  <g fill="none" stroke="#8FC2F0" stroke-opacity="0.09" stroke-width="3">
    <ellipse cx="470" cy="40" rx="90" ry="70"/>
    <ellipse cx="470" cy="40" rx="150" ry="118"/>
    <ellipse cx="470" cy="40" rx="210" ry="166"/>
    <ellipse cx="40" cy="480" rx="90" ry="70"/>
    <ellipse cx="40" cy="480" rx="150" ry="118"/>
  </g>
  <polygon points="256,86 403.2,171 403.2,341 256,426 108.8,341 108.8,171" fill="#141B22" stroke="#8FC2F0" stroke-width="14" stroke-linejoin="round"/>
  <path d="M184 238 L256 172 L328 238" fill="none" stroke="#9CC8F0" stroke-opacity="0.45" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M184 314 L256 248 L328 314" fill="none" stroke="#9CC8F0" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

mkdirSync('public', { recursive: true });
const src = Buffer.from(svg);
await sharp(src).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(src).resize(512, 512).png().toFile('public/icon-512-maskable.png');
await sharp(src).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(src).resize(180, 180).png().toFile('public/apple-touch-icon.png');
console.log('icons written to public/');
