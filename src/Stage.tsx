import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { WallText } from './WallText'

// The hero's one moment: a long text answer collapses into the six blocks a
// TakeSix answer would show instead, then one block opens into its own screen.
// Like a TakeSix level, the blocks sit on a grid with empty cells between
// them, laid out as a tree that reads from the top left.

const QUESTION = 'Explain how our checkout works'

interface Card {
  id: string
  /** Column and row on the level's grid, from 1 */
  at: [number, number]
  icon: string
  title: string
  description: string
  inside?: number
}

/** A level: its grid size, its blocks and the arrows between them. */
interface Level {
  cols: number
  rows: number
  cards: Card[]
  links: [string, string][]
}

// Cart → Checkout API, which branches into Payments → Settlement and
// Orders → Notifications. In reading order, so the cards come in that way.
const SIX: Level = {
  cols: 3,
  rows: 3,
  cards: [
    { id: 'cart', at: [1, 1], icon: '🛒', title: 'Cart', description: 'Items, discounts, totals', inside: 3 },
    { id: 'api', at: [2, 1], icon: '⬡', title: 'Checkout API', description: 'Creates the order', inside: 4 },
    { id: 'payments', at: [3, 1], icon: '💳', title: 'Payments', description: 'Charges via the provider', inside: 5 },
    { id: 'orders', at: [2, 2], icon: '📦', title: 'Orders', description: 'Pending to shipped', inside: 4 },
    { id: 'settle', at: [3, 2], icon: '🏦', title: 'Settlement', description: 'Nightly reconciliation', inside: 3 },
    { id: 'notify', at: [2, 3], icon: '✉', title: 'Notifications', description: 'Emails and webhooks', inside: 2 },
  ],
  links: [
    ['cart', 'api'],
    ['api', 'payments'],
    ['api', 'orders'],
    ['payments', 'settle'],
    ['orders', 'notify'],
  ],
}

const ZOOMED = SIX.cards[2]!
const INSIDE: Level = {
  cols: 3,
  rows: 2,
  cards: [
    { id: 'charges', at: [1, 1], icon: '⚡', title: 'Charges', description: 'One per order' },
    { id: 'secure', at: [2, 1], icon: '🔒', title: '3-D Secure', description: 'Redirect and callback' },
    { id: 'provider', at: [3, 1], icon: '⇄', title: 'Provider', description: 'Adapter to the PSP' },
    { id: 'retries', at: [1, 2], icon: '↻', title: 'Retries', description: 'Twice, with backoff' },
    { id: 'refunds', at: [3, 2], icon: '↩', title: 'Refunds', description: 'Credit notes' },
  ],
  links: [
    ['charges', 'secure'],
    ['secure', 'provider'],
    ['charges', 'retries'],
  ],
}

/** The loop, in ms. A fake cursor drives it: it moves to a card, turns into a
    magnifier, clicks to zoom in, then clicks the breadcrumb to zoom out. */
const REST_TOP = 700
const MOVE_TO_CARD = 1400
const HOVER = 550
const PRESS = 160
const READ_INSIDE = 1600
const MOVE_TO_CRUMB = 1100
/** Durations of the CSS transitions the loop waits for. */
/** The zoom: --zoom-ms in base.css (ZOOM_MS of @takesix/react). */
const GROW = 480
const FADE = 250

type CursorKind = 'arrow' | 'zoom' | 'hand'

interface Cursor {
  x: number
  y: number
  kind: CursorKind
  shown: boolean
  pressed: boolean
  /** Counts clicks, so each one restarts the ripple animation. */
  clicks: number
  /** Duration of the move to (x, y), in ms; 0 jumps. */
  move: number
}

export function Stage() {
  // Changing the key remounts the answer, which restarts the whole sequence.
  const [run, setRun] = useState(0)

  return (
    <figure className="stage" aria-label="A long text answer turns into six blocks, and one of them opens">
      <p className="ask">{QUESTION}</p>
      <Answer key={run} />
      <figcaption>
        <span>Same answer, one screen at a time.</span>
        <button type="button" onClick={() => setRun(r => r + 1)}>
          Play again
        </button>
      </figcaption>
    </figure>
  )
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

function Answer() {
  const outerRef = useRef<HTMLDivElement>(null)
  // The zoom layer: starts at the card's box, grows to fill the answer (open),
  // shows the inner level (inside), and shrinks back on the way out.
  const [zoomFrom, setZoomFrom] = useState<Box | null>(null)
  const [open, setOpen] = useState(false)
  const [inside, setInside] = useState(false)
  const [away, setAway] = useState(false)
  // The inner level mounts when it first shows (so its cards animate in) and
  // stays while the layer shrinks.
  const [innerMounted, setInnerMounted] = useState(false)
  // The loop starts once the six cards have animated in. Timers alone would
  // run ahead of CSS animations, which pause while the tab is not painted.
  const [ready, setReady] = useState(false)

  const answerRef = useRef<HTMLDivElement>(null)
  // How far the long answer scrolls: to its last line.
  const wallRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const wall = wallRef.current
    const content = wall?.firstElementChild as HTMLElement | null
    if (!wall || !content) return
    const distance = Math.max(0, content.offsetHeight - wall.clientHeight + 36)
    wall.style.setProperty('--wall-scroll', `${-distance}px`)
  }, [])
  const crumbRef = useRef<HTMLSpanElement>(null)
  const [cursor, setCursor] = useState<Cursor>({ x: 0, y: 0, kind: 'arrow', shown: false, pressed: false, clicks: 0, move: 0 })

  useEffect(() => {
    if (!ready) return
    const timers: number[] = []
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const update = (patch: Partial<Cursor>) => setCursor(c => ({ ...c, ...patch }))

    /** Centre of an element in the answer's coordinates. */
    function centre(el: Element | null | undefined) {
      const answer = answerRef.current
      if (!el || !answer) return null
      const r = el.getBoundingClientRect()
      const a = answer.getBoundingClientRect()
      return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 }
    }

    function click(then: () => void) {
      setCursor(c => ({ ...c, pressed: true, clicks: c.clicks + 1 }))
      after(PRESS, () => {
        update({ pressed: false })
        then()
      })
    }

    function toCard() {
      // Nobody is watching: try again later rather than run ahead.
      if (document.hidden) {
        after(1000, toCard)
        return
      }
      const p = centre(outerRef.current?.querySelector(`[data-id="${ZOOMED.id}"]`))
      if (!p) return
      update({ ...p, kind: 'arrow', move: MOVE_TO_CARD })
      // Over a card the viewer shows a magnifier: the card opens on click.
      after(MOVE_TO_CARD, () => update({ kind: 'zoom' }))
      after(MOVE_TO_CARD + HOVER, () => click(zoomIn))
    }

    function zoomIn() {
      const card = outerRef.current?.querySelector<HTMLElement>(`[data-id="${ZOOMED.id}"]`)
      if (!card) return
      // The level fills the answer, so card offsets are the answer's.
      setZoomFrom({ top: card.offsetTop, left: card.offsetLeft, width: card.offsetWidth, height: card.offsetHeight })
      setAway(true)
      after(GROW + 150, () => {
        setInnerMounted(true)
        setInside(true)
      })
      after(GROW + 150 + READ_INSIDE, toCrumb)
    }

    function toCrumb() {
      if (document.hidden) {
        after(1000, toCrumb)
        return
      }
      const p = centre(crumbRef.current)
      if (!p) return
      update({ ...p, kind: 'arrow', move: MOVE_TO_CRUMB })
      after(MOVE_TO_CRUMB, () => update({ kind: 'hand' }))
      after(MOVE_TO_CRUMB + HOVER, () => click(zoomOut))
    }

    function zoomOut() {
      update({ kind: 'arrow' })
      setInside(false)
      after(FADE, () => {
        setOpen(false)
        setAway(false)
      })
      after(FADE + GROW + 50, () => {
        setZoomFrom(null)
        setInnerMounted(false)
      })
      after(FADE + GROW + REST_TOP, toCard)
    }

    // The cursor enters from the lower left corner of the answer.
    const answer = answerRef.current
    if (answer) update({ x: answer.clientWidth * 0.18, y: answer.clientHeight * 0.95, shown: true, move: 0 })
    after(REST_TOP, toCard)
    return () => {
      timers.forEach(clearTimeout)
    }
  }, [ready])

  // The layer mounts at the card's box. Reading its size makes the browser
  // compute that style, so opening it right away still runs the transition
  // (requestAnimationFrame would stall in a background tab).
  const zoomRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!zoomFrom) return
    void zoomRef.current?.offsetWidth
    setOpen(true)
  }, [zoomFrom])

  const zoomStyle: CSSProperties | undefined = zoomFrom
    ? open
      ? { top: 0, left: 0, width: '100%', height: '100%' }
      : zoomFrom
    : undefined

  return (
    <div className="answer" ref={answerRef}>
      <div className="wall" aria-hidden="true" ref={wallRef}>
        <div className="wall-scroll">
          <WallText />
        </div>
      </div>

      <div
        className={`level${away ? ' away' : ''}`}
        ref={outerRef}
        onAnimationEnd={e => {
          // No animation runs under reduced motion, so the loop never starts.
          const last = SIX.cards[SIX.cards.length - 1]!.id
          if (e.animationName === 'block-in' && (e.target as HTMLElement).dataset.id === last) setReady(true)
        }}
      >
        <Cards level={SIX} />
        <Arrows links={SIX.links} />
      </div>

      {zoomStyle && (
        <div className={`zoom${open ? ' open' : ''}`} style={zoomStyle} ref={zoomRef}>
          <div className={`zoom-head${inside ? ' shown' : ''}`}>
            <span className="crumb">
              <span className="crumb-link" ref={crumbRef}>
                Checkout
              </span>{' '}
              / Payments
            </span>
            <span className="zoom-title">
              {ZOOMED.icon} {ZOOMED.title}
            </span>
            <span className="zoom-desc">{ZOOMED.description}</span>
          </div>
          {innerMounted && (
            <div className={`zoom-body${inside ? ' shown' : ''}`}>
              <InnerLevel />
            </div>
          )}
        </div>
      )}

      <FakeCursor cursor={cursor} />
    </div>
  )
}

/** A drawn mouse pointer. Its position is the hotspot: each shape is offset so its tip or lens centre sits there. */
function FakeCursor({ cursor }: { cursor: Cursor }) {
  const { x, y, kind, shown, pressed, clicks, move } = cursor
  return (
    <div
      className={`cursor${shown ? ' shown' : ''}${pressed ? ' pressed' : ''}`}
      style={{ transform: `translate(${x}px, ${y}px)`, transitionDuration: `${move}ms, 0.3s` }}
      aria-hidden="true"
    >
      {clicks > 0 && <span key={clicks} className="ripple" />}
      <svg className={`cursor-icon ${kind}`} viewBox="0 0 26 26" width="26" height="26">
        {kind === 'arrow' && <path d="M3 2v17l4.5-4 3 6.5 2.6-1.1-2.8-6.4H16z" />}
        {kind === 'zoom' && (
          <>
            <path className="handle" d="M15 15l7 7" />
            <circle cx="10" cy="10" r="7" />
            <path className="plus" d="M7 10h6M10 7v6" />
          </>
        )}
        {kind === 'hand' && (
          <path d="M9 2.5c-1 0-1.8.8-1.8 1.8V13l-1.6-1.6c-.7-.7-1.9-.7-2.6 0s-.7 1.8 0 2.5l4.6 5c.9 1 2.2 1.6 3.6 1.6h3.3c2.6 0 4.7-2.1 4.7-4.7v-5.2c0-.9-.8-1.7-1.7-1.7s-1.7.8-1.7 1.7V10c0-.9-.8-1.7-1.7-1.7s-1.6.7-1.7 1.6v-.5c0-.9-.8-1.7-1.7-1.7-.3 0-.6.1-.8.2V4.3c0-1-.8-1.8-1.8-1.8z" />
        )}
      </svg>
    </div>
  )
}

function InnerLevel() {
  return (
    <div className="level inner">
      <Cards level={INSIDE} />
      <Arrows links={INSIDE.links} />
    </div>
  )
}

function Cards({ level }: { level: Level }) {
  const grid = { '--cols': level.cols, '--rows': level.rows } as CSSProperties
  return (
    <ul className="six" style={grid}>
      {level.cards.map((b, i) => (
        <StageCard key={b.id} card={b} index={i} />
      ))}
    </ul>
  )
}

function StageCard({ card, index }: { card: Card; index: number }) {
  const [col, row] = card.at
  return (
    <li data-id={card.id} style={{ '--i': index, gridColumn: col, gridRow: row } as CSSProperties}>
      <span className="six-head">
        <span className="six-icon" aria-hidden="true">
          {card.icon}
        </span>
        <span className="six-title">{card.title}</span>
      </span>
      <span className="six-desc">{card.description}</span>
      {card.inside !== undefined && <span className="six-inside">{card.inside} more inside</span>}
    </li>
  )
}

/**
 * Straight arrows between cards that share a row or a column, measured from
 * layout offsets (unaffected by the cards' scale animation). The level is the
 * svg's parent: a parent's ref is not attached yet when this effect runs.
 */
function Arrows({ links }: { links: [string, string][] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [paths, setPaths] = useState<string[]>([])

  useLayoutEffect(() => {
    const level = svgRef.current?.parentElement
    if (!level) return
    const measure = () => {
      const box = (id: string) => level.querySelector<HTMLElement>(`[data-id="${id}"]`)
      const next: string[] = []
      for (const [from, to] of links) {
        const a = box(from)
        const b = box(to)
        if (!a || !b) continue
        const pad = 3
        if (Math.abs(a.offsetTop - b.offsetTop) < 2) {
          const y = a.offsetTop + a.offsetHeight / 2
          next.push(`M${a.offsetLeft + a.offsetWidth + pad},${y} H${b.offsetLeft - pad}`)
        } else {
          const x = a.offsetLeft + a.offsetWidth / 2
          next.push(`M${x},${a.offsetTop + a.offsetHeight + pad} V${b.offsetTop - pad}`)
        }
      }
      setPaths(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(level)
    return () => observer.disconnect()
  }, [links])

  return (
    <svg className="arrows" aria-hidden="true" ref={svgRef}>
      <defs>
        {/* The TakeSix arrowhead of @takesix/react (a dart with swept barbs), smaller; tip at the path's end */}
        <marker id="stage-head" viewBox="-5 -1 19 13" refX="13" refY="5.5" markerWidth="9.5" markerHeight="6.5" orient="auto">
          <path d="M-4,0 L13,5.5 L-4,11 L0.5,5.5 Z" fill="var(--accent)" stroke="var(--accent)" strokeLinejoin="round" />
        </marker>
      </defs>
      {paths.map((d, i) => (
        <path key={i} d={d} markerEnd="url(#stage-head)" />
      ))}
    </svg>
  )
}
