#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '..');
const iconDir = path.join(ROOT, 'icons');
const svgPath = path.join(iconDir, 'icon.svg');
const svg = fs.readFileSync(svgPath, 'utf8');
const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

async function renderIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const image = await loadImage(dataUrl);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(image, 0, 0, size, size);
  const out = path.join(iconDir, `icon${size}.png`);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`Generated ${path.relative(ROOT, out)}`);
}

(async () => {
  for (const size of [16, 48, 128]) await renderIcon(size);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
