import { useEffect, useRef, useState } from 'react'
import { parseDocument } from '@takesix/core'
import { TakeSix } from '@takesix/react'
import diagramSource from './takesix.takesix.json?raw'
// Inlined so the logo takes the text colour (it draws with currentColor)
import logoSvg from './logo.svg?raw'
import { Stage } from './Stage'
import { DiagramOutline } from './DiagramOutline'

const parsed = parseDocument(diagramSource)
if (!parsed.ok) throw new Error('src/takesix.takesix.json is not a valid takesix document: run npm run validate')
const diagram = parsed.document

const COMMANDS = [
  { label: 'Claude Code', text: 'claude mcp add takesix -- npx -y @takesix/mcp' },
  { label: 'Codex', text: 'codex mcp add takesix -- npx -y @takesix/mcp' },
]

const GITHUB = 'https://github.com/vvapnik'

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/** True when `from` or a parent below `root` can still scroll in the wheel's direction. */
function innerScrolls(from: EventTarget | null, root: HTMLElement, down: boolean): boolean {
  for (let n = from instanceof Element ? from : null; n && n !== root; n = n.parentElement) {
    if (n.scrollHeight <= n.clientHeight + 1 || !/(auto|scroll)/.test(getComputedStyle(n).overflowY)) continue
    if (down ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0) return true
  }
  return false
}

export function App() {
  const snapRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const demoRef = useRef<HTMLElement>(null)

  const goTo = (target: HTMLElement | null) => target?.scrollIntoView({ behavior: scrollBehavior() })

  // CSS snapping alone pulls a short wheel scroll back to where it started.
  // One wheel gesture moves a whole screen instead; touch and keys keep the
  // browser's own snapping.
  useEffect(() => {
    const root = snapRef.current
    const hero = heroRef.current
    const demo = demoRef.current
    if (!root || !hero || !demo) return
    let lockedUntil = 0

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      const down = e.deltaY > 0
      if (innerScrolls(e.target, root!, down)) return
      // A hero taller than the window (short screens) scrolls normally to its end.
      if (down && root!.scrollTop + root!.clientHeight < hero!.offsetHeight - 1) return
      e.preventDefault()
      const target = down ? demo! : hero!
      if (Date.now() < lockedUntil || Math.abs(root!.scrollTop - target.offsetTop) < 2) return
      lockedUntil = Date.now() + 700
      goTo(target)
    }

    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <main className="snap" ref={snapRef}>
      <section className="hero" ref={heroRef} aria-labelledby="hero-title">
        <header className="bar">
          <a className="brand" href="./" aria-label="TakeSix home">
            <span className="logo" dangerouslySetInnerHTML={{ __html: logoSvg }} />
            TakeSix
          </a>
          <nav className="links" aria-label="Project">
            <a href="./editor/">Editor</a>
            <SourceMenu />
          </nav>
        </header>

        <div className="hero-body">
          <div className="pitch">
            <h1 id="hero-title">Answers as diagrams, not walls of text</h1>
            <p className="lead">
              TakeSix lets an AI agent answer with a diagram you can click into. The gist fits on one screen of six
              blocks at most; every block opens into its own screen, and the long text waits in a side panel.
            </p>
            <ul className="commands">
              {COMMANDS.map(c => (
                <Command key={c.label} {...c} />
              ))}
            </ul>
            <div className="actions">
              <button type="button" className="primary" onClick={() => goTo(demoRef.current)}>
                Open the diagram
              </button>
              <a className="secondary" href={`${GITHUB}/takesix-core/blob/main/FORMAT.md`}>
                Read the format
              </a>
            </div>
            <p className="fine">Open source under MIT: format, libraries, skill and MCP server.</p>
          </div>
          <Stage />
        </div>

        <button type="button" className="cue" onClick={() => goTo(demoRef.current)}>
          <ChevronDown />
          <span>Try a TakeSix diagram about TakeSix</span>
        </button>
      </section>

      <section className="demo" ref={demoRef} aria-label="Live TakeSix diagram">
        <div className="demo-bar">
          <span>Live TakeSix diagram</span>
          <div className="demo-actions">
            <a href="./editor/">Edit it in the editor</a>
            <button type="button" onClick={() => goTo(heroRef.current)}>
              Back to top
            </button>
          </div>
        </div>
        <div className="demo-view">
          <TakeSix document={diagram} />
        </div>
        <DiagramOutline document={diagram} />
      </section>
    </main>
  )
}

const SOURCES = [
  { href: `${GITHUB}/takesix-core/blob/main/FORMAT.md`, title: 'Format', note: 'The JSON specification' },
  { href: `${GITHUB}/takesix-agent`, title: 'Agents', note: 'Agent Skill and MCP server' },
  { href: `${GITHUB}/takesix-react`, title: 'React', note: 'Viewer and editor component' },
  { href: `${GITHUB}/takesix`, title: 'This site', note: 'Landing page and editor' },
]

/** The source links in one dropdown; closes on Escape and on a click outside. */
function SourceMenu() {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const close = () => menu.removeAttribute('open')
    const onPointer = (e: PointerEvent) => {
      if (!menu.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menu.open) {
        close()
        menu.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <details className="source" ref={ref}>
      <summary>
        Source
        <ChevronDown />
      </summary>
      <ul>
        {SOURCES.map(s => (
          <li key={s.title}>
            <a href={s.href}>
              <span>{s.title}</span>
              <small>{s.note}</small>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

function Command({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the command stays selectable.
    }
  }

  return (
    <li className="command">
      <span className="command-label">{label}</span>
      <code>{text}</code>
      <button type="button" onClick={copy} aria-label={`Copy the ${label} command`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </li>
  )
}

function ChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
