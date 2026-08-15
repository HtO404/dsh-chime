// dsh-chime host half: task-completion notification queue + preset sound serving.
// A root agent going idle means a top-level task (a user-session turn) finished.
// Subagent (child) completions are intermediate steps of a bigger task and are ignored.
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_SOUNDS = path.join(__dirname, '..', 'assets', 'sounds')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const SOUNDS_DIR = path.join(DSH_HOME, 'dsh-chime', 'sounds')
const MAX_BYTES = 2 * 1024 * 1024
const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac' }

// Make sure the preset directory exists; seed the bundled preset sounds when it
// is empty so a fresh install works out of the box.
function ensureSoundsDir() {
  try {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true })
    const existing = fs.readdirSync(SOUNDS_DIR).filter((n) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(n))
    if (existing.length === 0 && fs.existsSync(ASSETS_SOUNDS)) {
      let copied = 0
      for (const f of fs.readdirSync(ASSETS_SOUNDS)) {
        const src = path.join(ASSETS_SOUNDS, f)
        if (!fs.statSync(src).isFile()) continue
        fs.copyFileSync(src, path.join(SOUNDS_DIR, f))
        copied++
      }
      console.log(`dsh-chime: seeded ${copied} preset sound(s) into ${SOUNDS_DIR}`)
    }
  } catch (e) {
    console.error('dsh-chime: ensureSoundsDir failed', e)
  }
}

export const name = 'task-chime'
export const inject = ['agents', 'fs', 'webServer']

export function apply(ctx) {
  ensureSoundsDir()

  let pending = 0
  const MAX_PENDING = 3

  ctx.on('agent/status', ({ agent, status }) => {
    if (status !== 'idle') return
    if (!agent || typeof agent.id !== 'string') return
    let isRoot = false
    try {
      isRoot = ctx.agents.roots().some((root) => root.id === agent.id)
    } catch (e) { /* registry transient */ }
    if (!isRoot) return
    pending = Math.min(pending + 1, MAX_PENDING)
  })

  let presetsCache = null
  let presetScan = null
  function scanPresets() {
    if (presetsCache) return Promise.resolve(presetsCache)
    if (presetScan) return presetScan
    presetScan = (async () => {
      const dir = await ctx.fs.resolve(SOUNDS_DIR)
      const entries = await ctx.fs.listDir(dir)
      const list = []
      for (const e of entries) {
        if (!e || e.type !== 'file' || typeof e.name !== 'string') continue
        const m = /^(.+)\.([A-Za-z0-9]+)$/.exec(e.name)
        if (!m || !MIME[m[2].toLowerCase()]) continue
        list.push({ id: e.name, name: m[1] })
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      return list
    })().catch((err) => {
      console.error('dsh-chime: preset scan failed', err)
      return []
    }).then((list) => { presetsCache = list; return list })
    return presetScan
  }

  function sendJson(res, body, status = 200) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
  }

  const routes = [
    {
      kind: 'exact',
      path: '/dsh-chime/poll',
      handler: (req, res) => {
        const value = pending
        pending = 0
        sendJson(res, { pending: value })
      },
    },
    {
      kind: 'exact',
      path: '/dsh-chime/presets',
      handler: async (req, res) => {
        try {
          sendJson(res, { presets: await scanPresets(), soundsDir: SOUNDS_DIR })
        } catch (e) {
          sendJson(res, { presets: [], soundsDir: SOUNDS_DIR })
        }
      },
    },
    {
      kind: 'exact',
      path: '/dsh-chime/preset-audio',
      handler: async (req, res) => {
        let id = ''
        try {
          id = new URL(req.url, 'http://dsh.local').searchParams.get('id') || ''
        } catch (e) { /* ignore */ }
        if (!id || id.includes('\\') || id.includes('/') || id.includes('..')) {
          res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('bad id')
          return
        }
        try {
          const target = await ctx.fs.resolve(SOUNDS_DIR + '\\' + id)
          const bytes = await ctx.fs.readBytes(target, undefined, MAX_BYTES)
          const m = /\.([A-Za-z0-9]+)$/.exec(id)
          const mime = (m && MIME[m[1].toLowerCase()]) ? MIME[m[1].toLowerCase()] : 'audio/mpeg'
          res.writeHead(200, {
            'content-type': mime,
            'content-length': String(bytes.length),
            'cache-control': 'public, max-age=3600',
          })
          res.end(Buffer.from(bytes))
        } catch (e) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
          res.end('not found')
        }
      },
    },
  ]

  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route))
    return () => { for (const dispose of disposers) dispose() }
  }, 'dsh-chime: routes')
}
