import { useEffect, useRef } from 'react'
import { TakeSix } from '@takesix/react'
import { Stage } from './Stage'
import { DiagramOutline } from './DiagramOutline'
import { SiteHeader } from './shared/SiteHeader'
import { ChevronDown } from './shared/icons'
import { useCopy } from './shared/useCopy'
import { EXAMPLES } from './examples'

const diagram = EXAMPLES.takesix

const COMMANDS = [
  { label: 'Claude Code', text: 'claude mcp add takesix -- npx -y @takesix/mcp' },
  { label: 'Codex', text: 'codex mcp add takesix -- npx -y @takesix/mcp' },
]

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
        <SiteHeader />

        <div className="hero-body">
          <div className="pitch">
            <div className="headline">
              <h1 id="hero-title">Answers as diagrams, not walls of text</h1>
              <p className="badge">Early Access</p>
            </div>
            <p className="lead">
              TakeSix lets an AI agent answer with a diagram you can click into. The gist fits on one screen of six
              blocks at most; every block opens into its own screen, and the long text opens next to it.
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
              <a className="secondary" href="/format/">
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

      <section className="demo" id="demo" ref={demoRef} aria-label="Live TakeSix diagram">
        <div className="demo-bar">
          <span>Live TakeSix diagram</span>
          <div className="demo-actions">
            <a href="/editor/">Edit it in the editor</a>
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

function Command({ label, text }: { label: string; text: string }) {
  const { copied, copy } = useCopy(text)

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
