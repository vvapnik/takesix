// Records public/demo.gif for the READMEs: the architecture example opened in
// the standalone viewer, zooming into a block, deeper into one of its parts,
// into a text, and back up to the top through the breadcrumb.
//
// Needs Google Chrome and ffmpeg. Run: npm run demo-gif
// Chrome runs headless and is driven over the DevTools protocol; its
// screencast sends a frame whenever the page changes, with a timestamp, so the
// GIF plays at the real speed of the zoom.
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SOURCE = resolve('src/examples/architecture.takesix.json')
const OUTPUT = resolve('public/demo.gif')
const VIEWPORT = { width: 1100, height: 700 }
const SCALE = 2 // render sharp, then scale down
const GIF_WIDTH = 880
const FPS = 20
const PORT = 9333

// What the reader does: what to click (a CSS selector), then how long to look
const STEPS = [
  { pause: 1400 },
  { click: '[aria-label="Zoom into Platform"]', pause: 1400 },
  { click: '[aria-label="Zoom into Application"]', pause: 1400 },
  { click: '[aria-label="Read Core API"]', pause: 2000 },
  { click: 'nav[aria-label="Breadcrumb"] button', pause: 1800 },
]

// A drawn pointer: headless Chrome has no visible mouse
const CURSOR = `(() => {
  const c = document.createElement('div')
  c.id = 'demo-cursor'
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 14 L10.5 20.5 L13 19.4 L10 13 L16 13 Z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 99999, pointerEvents: 'none',
    transform: 'translate(${VIEWPORT.width * 0.62}px, ${VIEWPORT.height * 0.9}px)',
    transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)' })
  const s = document.createElement('style')
  s.textContent = '#demo-cursor::before { content: ""; position: absolute; left: -9px; top: -9px; width: 24px; height: 24px; border-radius: 50%; background: rgba(59, 91, 219, 0.35); transform: scale(0); } #demo-cursor.press::before { animation: demo-press 450ms ease-out; } @keyframes demo-press { from { transform: scale(0.3); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }'
  document.head.append(s)
  document.body.append(c)
})()`

const work = mkdtempSync(join(tmpdir(), 'takesix-gif-'))
const sleep = ms => new Promise(r => setTimeout(r, ms))

// The page: the same self-contained HTML that `takesix build` writes
const html = join(work, 'demo.html')
execFileSync('node', ['node_modules/@takesix/react/dist/cli.js', 'build', SOURCE, '-o', html], { stdio: 'inherit' })

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(work, 'profile')}`, 'about:blank',
], { stdio: 'ignore' })

try {
  let target
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200)
    target = await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json())
      .then(list => list.find(t => t.type === 'page')).catch(() => undefined)
  }
  if (!target) throw new Error('Chrome did not start')

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
  let nextId = 0
  const pending = new Map()
  const frames = []
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    if (msg.id !== undefined) {
      const p = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? p.fail(new Error(msg.error.message)) : p.ok(msg.result)
    } else if (msg.method === 'Page.screencastFrame') {
      frames.push({ data: msg.params.data, time: msg.params.metadata.timestamp })
      send('Page.screencastFrameAck', { sessionId: msg.params.sessionId })
    }
  }
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const id = ++nextId
    pending.set(id, { ok, fail })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const run = async expression => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text)
    return result.value
  }

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: SCALE, mobile: false })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await send('Page.navigate', { url: pathToFileURL(html).href })
  // Wait until the viewer shows the diagram (it stays invisible until fonts and styles are in)
  for (let i = 0; i < 50; i++) {
    if (await run(`!!document.querySelector('${STEPS[1].click}')`)) break
    await sleep(100)
  }
  await run(CURSOR)
  await sleep(800)

  // The screencast sends frames only on change: one still frame at the start and
  // the end is enough, the durations come from the timestamps
  await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
  for (const step of STEPS) {
    if (step.click) {
      // Move the pointer onto the target, press, then click
      const at = await run(`(el => {
        if (!el) return null
        const r = el.closest('[class*="card"]')?.getBoundingClientRect() ?? el.getBoundingClientRect()
        const x = Math.round(r.left + Math.min(r.width * 0.3, 90)), y = Math.round(r.top + Math.min(r.height * 0.4, 30))
        document.getElementById('demo-cursor').style.transform = 'translate(' + x + 'px, ' + y + 'px)'
        return true
      })(document.querySelector('${step.click}'))`)
      if (!at) {
        const labels = await run(`[...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' | ')`)
        throw new Error(`no ${step.click} on the screen; there are: ${labels}`)
      }
      await sleep(700)
      await run(`(c => { c.classList.remove('press'); void c.offsetWidth; c.classList.add('press') })(document.getElementById('demo-cursor'))`)
      await sleep(120)
      await run(`document.querySelector('${step.click}').click()`)
    }
    await sleep(step.pause)
  }
  const end = Date.now() / 1000
  await send('Page.stopScreencast')
  ws.close()
  if (frames.length < 10) throw new Error(`only ${frames.length} frames recorded`)

  // Frames with their durations, as an ffmpeg concat list
  const list = []
  frames.forEach((f, i) => {
    const file = join(work, `f${String(i).padStart(4, '0')}.png`)
    writeFileSync(file, Buffer.from(f.data, 'base64'))
    const next = frames[i + 1]?.time ?? (f.time + 0.1 > end ? f.time + 0.1 : end)
    list.push(`file '${file}'`, `duration ${Math.max(next - f.time, 0.01).toFixed(3)}`)
  })
  list.push(`file '${join(work, `f${String(frames.length - 1).padStart(4, '0')}.png`)}'`)
  writeFileSync(join(work, 'frames.txt'), `${list.join('\n')}\n`)

  const filter = `fps=${FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];` +
    '[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle'
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(work, 'frames.txt'),
    '-filter_complex', filter, '-loop', '0', OUTPUT], { stdio: 'inherit' })
  console.log(`wrote ${OUTPUT} from ${frames.length} frames`)
} finally {
  // Chrome writes its profile until it has quit
  const exited = new Promise(r => chrome.once('exit', r))
  chrome.kill()
  await exited
  rmSync(work, { recursive: true, force: true, maxRetries: 5 })
}
