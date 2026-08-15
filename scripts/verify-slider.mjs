import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

// Scan only the slider track row (y 176..200) for the amber fill span.
const files = process.argv.slice(2)
for (const f of files) {
  const png = PNG.sync.read(readFileSync(f))
  const { width: w, height: h, data } = png
  let minX = -1, maxX = -1
  for (let y = 176; y < 200 && y < h; y++) {
    for (let x = 90; x < 380 && x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const amberish = Math.abs(r - 245) < 30 && Math.abs(g - 158) < 30 && Math.abs(b - 11) < 40
      // also catch the amber thumb ring (#F59E0B border)
      if (amberish) {
        if (minX === -1 || x < minX) minX = x
        if (x > maxX) maxX = x
      }
    }
  }
  const span = minX >= 0 ? (maxX - minX + 1) : 0
  console.log(`${f.split('_drag-')[1]}: slider-amber span x=${minX}..${maxX} (${span}px)`)
}
