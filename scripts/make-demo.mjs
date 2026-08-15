// Regenerates docs/demo.gif from docs/demo.html.
// Requirements: system Google Chrome, `npm install` in this scripts/ directory.
// Run: node scripts/make-demo.mjs  (from the repo root)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright-core'
import gifenc from 'gifenc'
import { PNG } from 'pngjs'
const { GIFEncoder, quantize, applyPalette } = gifenc

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const demoUrl = 'file:///' + path.join(root, 'docs', 'demo.html').replace(/\\/g, '/')
const outPath = path.join(root, 'docs', 'demo.gif')

const VIEW_W = 780
const VIEW_H = 340
const FRAME_MS = 55 // gif delay ticks (1 tick = 10ms) => ~18 fps

const frames = []
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: VIEW_W, height: VIEW_H } })
  await page.goto(demoUrl, { waitUntil: 'load' })
  await page.waitForTimeout(400)

  const sleep = (ms) => page.waitForTimeout(ms)
  const shot = async () => { frames.push(await page.screenshot({ type: 'png' })) }
  const slowMove = async (x, y, steps = 12) => {
    for (let i = 1; i <= steps; i++) {
      const fx = (x - 20) * (i / steps) + 20
      const fy = (y - 20) * (i / steps) + 20
      await page.mouse.move(fx, fy, { steps: 1 })
      await sleep(FRAME_MS)
      await shot()
    }
    await page.mouse.move(x, y, { steps: 1 })
    await sleep(FRAME_MS)
    await shot()
  }
  const click = async (x, y, hold = 140) => {
    await page.mouse.move(x, y, { steps: 1 })
    await sleep(90); await shot()
    await page.mouse.down()
    await sleep(70); await shot()
    await page.mouse.up()
    await sleep(hold); await shot()
  }

  const box = (sel) => page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, sel)

  const selectBox = await box('#selectBox')
  const testBtn = await box('#testBtn')
  const volInput = await box('#vol')
  const muteBtn = await box('#muteBtn')

  // 1. cursor enters the panel, hovers the preset dropdown
  await slowMove(selectBox.x + selectBox.w - 10, selectBox.y + selectBox.h / 2, 14)
  await sleep(280); await shot()

  // 2. click opens the preset menu, then re-query its (now visible) rect
  await click(selectBox.x + selectBox.w / 2, selectBox.y + selectBox.h / 2, 200)
  await sleep(200); await shot()
  const menuOpen = await box('#menu')

  // 3. hover + pick a preset (02-双声蜂鸣 is the second option)
  const optCenter = (i) => menuOpen.y + 4 + 30 * i + 15
  await slowMove(menuOpen.x + menuOpen.w / 2, optCenter(0), 8)
  await sleep(160); await shot()
  await slowMove(menuOpen.x + menuOpen.w / 2, optCenter(1), 8)
  await sleep(160); await shot()
  await click(menuOpen.x + menuOpen.w / 2, optCenter(1), 200)

  // 4. hover + click 测试声音 (pulse + beep)
  await slowMove(testBtn.x + testBtn.w / 2, testBtn.y + testBtn.h / 2, 10)
  await sleep(220); await shot()
  await click(testBtn.x + testBtn.w / 2, testBtn.y + testBtn.h / 2, 260)
  await sleep(200); await shot()

  // 5. drag volume from 70% to 30%
  const trackX = volInput.x
  const trackW = volInput.w
  const thumbY = volInput.y + volInput.h / 2
  const xAt = (pct) => trackX + (trackW * pct) / 100
  await slowMove(xAt(70), thumbY, 10)
  await sleep(160); await shot()
  await page.mouse.move(xAt(70), thumbY, { steps: 1 })
  await page.mouse.down()
  await sleep(60); await shot()
  for (let pct = 66; pct >= 30; pct -= 4) {
    await page.mouse.move(xAt(pct), thumbY, { steps: 1 })
    await sleep(FRAME_MS)
    await shot()
  }
  await page.mouse.up()
  await sleep(240); await shot()

  // 6. mute toggle
  await slowMove(muteBtn.x + muteBtn.w / 2, muteBtn.y + muteBtn.h / 2, 10)
  await sleep(180); await shot()
  await click(muteBtn.x + muteBtn.w / 2, muteBtn.y + muteBtn.h / 2, 220)

  // 7. cursor exits
  await slowMove(VIEW_W - 40, VIEW_H - 24, 10)
  await sleep(220); await shot()
} finally {
  if (browser) await browser.close()
}

// encode GIF
const encoder = GIFEncoder()
for (const buf of frames) {
  const png = PNG.sync.read(buf)
  const palette = quantize(png.data, 256)
  const index = applyPalette(png.data, palette)
  encoder.writeFrame(index, png.width, png.height, { palette, delay: FRAME_MS / 10 })
}
encoder.finish()
writeFileSync(outPath, encoder.bytes())
console.log(`docs/demo.gif written: ${frames.length} frames, ${(readFileSync(outPath).length / 1024).toFixed(0)} KB`)
