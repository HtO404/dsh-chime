import { chromium } from 'playwright-core'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1280, height: 840 } })
p.on('pageerror', (e) => console.log('pageerror: ' + e.message))
await p.goto('http://127.0.0.1:64718/?dsh-desktop-mode=compatibility&dsh-desktop-platform=win32')
await p.waitForTimeout(4000)
await p.evaluate(() => { const el = document.querySelector('button[class*="trigger"]'); if (el) el.click() })
await p.waitForTimeout(900)
await p.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button, div, span, li'))
  const el = els.find((x) => (x.textContent || '').trim() === '插件')
  if (el) el.click()
})
await p.waitForTimeout(900)

const before = await p.evaluate(() => {
  const b2 = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('静音'))
  return b2 ? b2.textContent.trim() : '(no mute btn)'
})
const ok = await p.evaluate(() => {
  const b2 = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('静音'))
  if (b2) { b2.click(); return true }
  return false
})
await p.waitForTimeout(800)
const after = await p.evaluate(() => {
  const b2 = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('恢复声音') || (x.textContent || '').includes('静音'))
  return b2 ? b2.textContent.trim() : '(none)'
})
console.log('MUTE_BEFORE:', before, 'CLICKED:', ok, 'AFTER:', after)

await p.evaluate(() => {
  const r = document.querySelector('input[type=range]')
  if (r) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(r, '30')
    r.dispatchEvent(new Event('input', { bubbles: true }))
  }
})
await p.waitForTimeout(400)
const pct = await p.evaluate(() => {
  const t = document.body.innerText || ''
  const m = t.match(/(\d+)%/)
  return m ? m[0] : null
})
console.log('VOLUME_PCT_AFTER_SET30:', pct)
await b.close()
