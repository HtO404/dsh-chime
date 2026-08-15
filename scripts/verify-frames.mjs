import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const files = process.argv.slice(2)
for (const f of files) {
  const png = PNG.sync.read(readFileSync(f))
  const { width: w, height: h, data } = png
  let amber = 0, dark = 0
  let darkX = 0, darkY = 0
  let fillX = -1, fillMaxX = -1
  // scan region for the slider row: the amber fill is in the track area
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (Math.abs(r - 245) < 30 && Math.abs(g - 158) < 30 && Math.abs(b - 11) < 40) amber++
      if (r < 60 && g < 60 && b < 60) { dark++; darkX += x; darkY += y }
      // amber fill row: find the widest contiguous amber run per row (slider)
      if (Math.abs(r - 245) < 30 && Math.abs(g - 158) < 30 && Math.abs(b - 11) < 40) {
        if (fillX === -1) fillX = x
        if (x > fillMaxX) fillMaxX = x
      }
    }
  }
  const cx = dark > 0 ? (darkX / dark).toFixed(0) : '-'
  const cy = dark > 0 ? (darkY / dark).toFixed(0) : '-'
  console.log(`${f.split('_check-')[1]}: ${w}x${h} amberPx=${amber} darkPx=${dark} cursor~=(${cx},${cy}) sliderFill=(${fillX}..${fillMaxX})`)
}
