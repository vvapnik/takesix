import { useEffect, useId, useRef, useState } from 'react'
import type { TakeSixDocument } from '@takesix/core'
import './journeys.css'

/**
 * "Journeys" dropdown for a page around a diagram: the document's journeys,
 * and "New journey" where the page can edit the document. Nothing when there
 * is neither.
 */
export function JourneysMenu({ document: doc, active, onStart, onCreate, className = '' }: {
  document: TakeSixDocument
  /** Id of the journey on screen. */
  active?: string
  onStart: (id: string) => void
  onCreate?: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const journeys = doc.journeys ?? []

  // Closes on Escape and on a click outside
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onPointer = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  if (!journeys.length && !onCreate) return null

  return (
    <div ref={rootRef} className={`journeys ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(o => !o)}
      >
        Journeys
      </button>
      {open && (
        <div id={menuId} className="journeys-menu" role="menu" aria-label="Journeys">
          {journeys.map(j => (
            <button
              key={j.id}
              type="button"
              role="menuitemradio"
              aria-checked={active === j.id}
              onClick={() => { setOpen(false); onStart(j.id) }}
            >
              <span>{j.title}</span>
              <span className="journeys-count">{j.steps.length} {j.steps.length === 1 ? 'step' : 'steps'}</span>
            </button>
          ))}
          {!journeys.length && <p className="journeys-empty">No journeys yet</p>}
          {onCreate && (
            <button type="button" role="menuitem" className="journeys-new" onClick={() => { setOpen(false); onCreate() }}>
              New journey
            </button>
          )}
        </div>
      )}
    </div>
  )
}
