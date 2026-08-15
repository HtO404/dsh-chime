// Convert docs/*.svg to docs/*.png using the system Chrome (playwright-core, zero ffmpeg).
// Usage: node scripts/svg-to-png.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['banner', 'panel', 'flow'];

const browser = await chromium.launch({ channel: 'chrome' });

for (const name of targets) {
  const svgPath = join(root, 'docs', `${name}.svg`);
  const pngPath = join(root, 'docs', `${name}.png`);
  const svg = readFileSync(svgPath, 'utf8');
  const m = svg.match(/width="(\d+(?:\.\d+)?)"[\s\S]*?height="(\d+(?:\.\d+)?)"/);
  if (!m) throw new Error(`cannot parse size from ${name}.svg`);
  const [ , w, h ] = m.map(Number);
  const scale = 2; // 2x for crisp text
  const page = await browser.newPage({
    viewport: { width: Math.ceil(w * scale), height: Math.ceil(h * scale) },
    deviceScaleFactor: scale,
  });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${svg}</body></html>`);
  await page.waitForTimeout(200);
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(pngPath, buf);
  console.log(`${name}.svg (${w}x${h}) -> ${name}.png (${buf.length} bytes)`);
  await page.close();
}

await browser.close();
console.log('done');
