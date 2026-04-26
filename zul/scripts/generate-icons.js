import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'src/components/zul-logo.svg'));

mkdirSync(join(root, 'public'), { recursive: true });

const icons = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 512, name: 'icon-maskable.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

for (const { size, name } of icons) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(root, 'public', name));
  console.log(`Generated ${name}`);
}

console.log('Done!');
