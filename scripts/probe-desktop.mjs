import { chromium } from 'playwright-core'
const URL = 'http://127.0.0.1:64718/?dsh-desktop-mode=compatibility&dsh-desktop-platform=win32'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 840 } })
const logs = []
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)

const clickByText = async (t) => page.evaluate((text) => {
  const el = Array.from(document.querySelectorAll('button, [role=button], a, div, span, li'))
    .find((x) => (x.textContent || '').trim() === text)
  if (el) { el.click(); return true }
  return false
}, t)

await page.evaluate(() => {
  const el = document.querySelector('button[class*="trigger"]')
  if (el) { el.click(); return true }
  return false
})
await page.waitForTimeout(900)
const tab = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('button, [role=button], div, span, li'))
  const el = els.find((x) => (x.textContent || '').trim() === '插件' && x.textContent.length < 10)
  if (el) { el.click(); return true }
  return false
})
console.log('CLICKED_PLUGINS_TAB:', tab)
await page.waitForTimeout(1000)

let state = await page.evaluate(() => {
  const t = document.body.innerText || ''
  return {
    hasCard: t.includes('任务完成提示音'),
    hasTest: t.includes('测试声音'),
    hasMute: t.includes('静音'),
    hasVolume: t.includes('音量'),
    hasPresetNames: t.includes('欢快铃声'),
  }
})
console.log('STATE:', JSON.stringify(state))

// dump the plugins panel region text
const region = await page.evaluate(() => {
  const t = document.body.innerText || ''
  const i = t.indexOf('插件')
  return i >= 0 ? t.slice(i, i + 700) : '(no 插件 section)'
})
console.log('--- PLUGINS PANEL TEXT ---')
console.log(region)

// click 测试声音 and watch for changes
if (state.hasTest) {
  const before = await page.evaluate(() => document.body.innerText.length)
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').includes('测试声音'))
    if (b) { b.click(); return true }
    return false
  })
  console.log('CLICKED_TEST:', clicked)
  await page.waitForTimeout(1200)
  const after = await page.evaluate(() => document.body.innerText.length)
  console.log('TEXT_DELTA:', after - before)
  // any error line appeared?
  const err = await page.evaluate(() => {
    const t = document.body.innerText || ''
    const m = t.match(/⚠[^\n]{0,80}/)
    return m ? m[0] : null
  })
  console.log('ERROR_LINE:', err)
}
console.log('--- LOGS ---')
console.log(logs.join('\n') || '(no console output)')
await browser.close()
