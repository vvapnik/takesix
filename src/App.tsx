import { useRef, useState } from 'react'
import type { JourneyAddress } from '@takesix/core'
import { TakeSix } from '@takesix/react'
import { Stage } from './Stage'
import { DiagramOutline } from './DiagramOutline'
import { SiteHeader } from './shared/SiteHeader'
import { ChevronDown } from './shared/icons'
import { useCopy } from './shared/useCopy'
import { JourneysMenu } from './shared/JourneysMenu'
import { EXAMPLES } from './examples'

const diagram = EXAMPLES.takesix

const COMMANDS = [
  { label: 'Claude Code', text: 'claude mcp add takesix -- npx -y @takesix/mcp' },
  { label: 'Codex', text: 'codex mcp add takesix -- npx -y @takesix/mcp' },
]

const PRINCIPLES = [
  { title: 'The gist on one screen.', text: 'At most six blocks, placed on a 6×6 grid: the whole answer reads at a glance.' },
  { title: 'Click for depth.', text: 'Any block opens into its own screen of up to six more, as many levels as the subject needs.' },
  { title: 'Long text where it belongs.', text: 'A block can open into text instead, next to the part it explains.' },
  { title: 'Written by the agent.', text: 'One JSON file; the validator points at every problem, so the agent fixes its own answer.' },
  { title: 'Opens anywhere.', text: 'One HTML file that works offline, the editor in the browser, or right in the chat.' },
]

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function App() {
  const [journey, setJourney] = useState<JourneyAddress | null>(null)
  const snapRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const demoRef = useRef<HTMLElement>(null)
  const tourRef = useRef<HTMLElement>(null)

  const goTo = (target: HTMLElement | null) => target?.scrollIntoView({ behavior: scrollBehavior() })

  return (
    <main className="snap" ref={snapRef}>
      <section className="hero" ref={heroRef} aria-labelledby="hero-title">
        <SiteHeader />

        <div className="hero-body">
          <div className="pitch">
            <div className="headline">
              <h1 id="hero-title">Answers as diagrams, not walls of text</h1>
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

        <button type="button" className="cue" onClick={() => goTo(tourRef.current)}>
          <ChevronDown />
          <span>Next: how it works</span>
        </button>
      </section>

      <section className="tour" id="how-it-works" ref={tourRef} aria-labelledby="tour-title">
        <div className="tour-body">
          <a className="tour-gif" href="/examples/architecture/">
            <img
              src="/demo.gif"
              width={880}
              height={560}
              loading="lazy"
              alt="A TakeSix diagram of a web app architecture: a click zooms into a block, into one of its parts, into its text, and back to the top."
            />
          </a>
          <div className="tour-text">
            <h2 id="tour-title">How it works</h2>
            <ul className="principles">
              {PRINCIPLES.map(p => (
                <li key={p.title}>
                  <strong>{p.title}</strong> {p.text}
                </li>
              ))}
            </ul>
          </div>
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
            <JourneysMenu document={diagram} active={journey?.journey} onStart={id => setJourney({ journey: id, step: 0 })} />
            <a href="/editor/">Edit it in the editor</a>
            <button type="button" onClick={() => goTo(heroRef.current)}>
              Back to top
            </button>
          </div>
        </div>
        <div className="demo-view">
          <TakeSix document={diagram} journey={journey} onJourneyChange={setJourney} />
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
