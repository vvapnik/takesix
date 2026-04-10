import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import type { Entity, Layout } from './types'
import { BlockCard } from './BlockCard'
import type { CardRect } from './BlockCard'
import styles from './Viewer.module.css'

interface StackEntry {
  entities: Entity[]
  label: string
  entity?: Entity
  cardRect?: CardRect // screen rect of the card that was drilled into
}

interface Props {
  root: Entity[]
  editMode: boolean
  rootLayout: Layout
  onUpdate: (id: string, changes: Partial<Entity>) => void
  onDelete: (id: string) => void
  onAdd: (parentId: string | null, entity?: Entity) => void
  onSetLayout: (id: string | null, layout: Layout) => void
  onConnect: (fromId: string, toId: string) => void
  onDisconnect: (fromId: string, toId: string) => void
}

interface Arrow {
  from: string
  to: string
  d: string
}

function findEntity(entities: Entity[], id: string): Entity | undefined {
  for (const e of entities) {
    if (e.id === id) return e
    if (e.children?.length) {
      const found = findEntity(e.children, id)
      if (found) return found
    }
  }
}

// Distribute N connection points symmetrically around the center of an edge
function slotPos(idx: number, total: number, edgeLen: number): number {
  if (total <= 1) return 0
  const spacing = Math.min(16, edgeLen * 0.6 / total)
  return (idx - (total - 1) / 2) * spacing
}

function computeArrowPath(
  fromRect: DOMRect,
  toRect: DOMRect,
  obstacleRects: DOMRect[],
  containerRect: DOMRect,
  exitIdx: number, exitTotal: number,
  entryIdx: number, entryTotal: number
): string {
  const cl = containerRect.left
  const ct = containerRect.top
  const fromCX = (fromRect.left + fromRect.right) / 2
  const fromCY = (fromRect.top + fromRect.bottom) / 2
  const toCX = (toRect.left + toRect.right) / 2
  const toCY = (toRect.top + toRect.bottom) / 2
  const dx = toCX - fromCX
  const dy = toCY - fromCY

  const sameRow = Math.abs(dy) < Math.min(fromRect.height, toRect.height) * 0.5

  if (sameRow) {
    const goRight = dx >= 0
    // Exit/entry on the left/right edges — slot along Y
    const x1 = (goRight ? fromRect.right : fromRect.left) - cl
    const y1 = fromCY - ct + slotPos(exitIdx, exitTotal, fromRect.height)
    const x2 = (goRight ? toRect.left : toRect.right) - cl
    const y2 = toCY - ct + slotPos(entryIdx, entryTotal, toRect.height)

    const blocked = obstacleRects.some(r => {
      const rCX = (r.left + r.right) / 2
      const inX = goRight ? rCX > fromRect.right - 4 && rCX < toRect.left + 4
                           : rCX < fromRect.left + 4 && rCX > toRect.right - 4
      const inY = Math.abs((r.top + r.bottom) / 2 - fromCY) < (fromRect.height + r.height) * 0.4
      return inX && inY
    })

    if (!blocked) {
      const offset = Math.min(Math.abs(dx) * 0.4, 80)
      const s = goRight ? 1 : -1
      return `M ${x1} ${y1} C ${x1 + s * offset} ${y1}, ${x2 - s * offset} ${y2}, ${x2} ${y2}`
    } else {
      // Arc below the row — exit/entry on bottom edges, slot along X
      const bx1 = fromCX - cl + slotPos(exitIdx, exitTotal, fromRect.width)
      const by1 = fromRect.bottom - ct
      const bx2 = toCX - cl + slotPos(entryIdx, entryTotal, toRect.width)
      const by2 = toRect.bottom - ct
      const arcY = Math.max(by1, by2) + 32
      return `M ${bx1} ${by1} C ${bx1} ${arcY}, ${bx2} ${arcY}, ${bx2} ${by2}`
    }
  } else {
    // Different rows — exit/entry on top/bottom edges, slot along X
    const goDown = dy > 0
    const x1 = fromCX - cl + slotPos(exitIdx, exitTotal, fromRect.width)
    const y1 = (goDown ? fromRect.bottom : fromRect.top) - ct
    const x2 = toCX - cl + slotPos(entryIdx, entryTotal, toRect.width)
    const y2 = (goDown ? toRect.top : toRect.bottom) - ct
    const fromEdge = goDown ? fromRect.bottom : fromRect.top
    const toEdge = goDown ? toRect.top : toRect.bottom
    const gapY = (fromEdge + toEdge) / 2 - ct
    return `M ${x1} ${y1} C ${x1} ${gapY}, ${x2} ${gapY}, ${x2} ${y2}`
  }
}

export function Viewer({ root, editMode, rootLayout, onUpdate, onDelete, onAdd, onSetLayout, onConnect, onDisconnect }: Props) {
  const slideRef = useRef<HTMLDivElement>(null)
  const pendingFrom = useRef<CardRect | null>(null)
  const needsReset = useRef(false)
  const isAnimating = useRef(false)
  const cardElsMap = useRef(new Map<string, HTMLDivElement>())
  const gridAreaRef = useRef<HTMLDivElement>(null)

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [arrows, setArrows] = useState<Arrow[]>([])

  const [stack, setStack] = useState<StackEntry[]>([
    { entities: root.slice(0, 6), label: 'Root' },
  ])
  const [layoutKey, setLayoutKey] = useState(0)

  // Sync stack with root whenever data changes (e.g. after deletion)
  useEffect(() => {
    setStack(prev => {
      const next: StackEntry[] = []
      for (const entry of prev) {
        if (!entry.entity) {
          next.push({ ...entry, entities: root.slice(0, 6) })
        } else {
          const updated = findEntity(root, entry.entity.id)
          if (!updated) break // entity was deleted — trim stack here
          next.push({ ...entry, entity: updated, entities: (updated.children ?? []).slice(0, 6) })
        }
      }
      return next.length ? next : [{ entities: root.slice(0, 6), label: 'Root' }]
    })
  }, [root])

  const current = stack[stack.length - 1]
  const isNested = stack.length > 1
  const currentLayout: Layout = current.entity?.layout ?? rootLayout

  // FLIP: runs synchronously after DOM update, before paint
  useLayoutEffect(() => {
    const slide = slideRef.current
    if (!slide) return

    if (needsReset.current) {
      // After zoom-out: snap slide back to natural position with parent content
      needsReset.current = false
      slide.style.transition = 'none'
      slide.style.transform = ''
      slide.style.transformOrigin = ''
      return
    }

    const from = pendingFrom.current
    pendingFrom.current = null
    if (!from) return

    // Measure where the slide now sits (full-screen target)
    const to = slide.getBoundingClientRect()

    const sx = from.width / to.width
    const sy = from.height / to.height
    const dx = (from.left + from.width / 2) - (to.left + to.width / 2)
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2)

    // Snap to card position
    slide.style.transition = 'none'
    slide.style.transformOrigin = 'center center'
    slide.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`

    // Force reflow
    slide.getBoundingClientRect()

    // Animate to natural position
    requestAnimationFrame(() => {
      slide.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
      slide.style.transform = ''
      slide.addEventListener('transitionend', () => {
        slide.style.transition = ''
        slide.style.transformOrigin = ''
      }, { once: true })
    })
  }, [layoutKey])

  // Cancel connecting when leaving edit mode
  useEffect(() => {
    if (!editMode) setConnectingFrom(null)
  }, [editMode])

  // ESC cancels connecting
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setConnectingFrom(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Recompute arrow paths after entities/layout settle
  useEffect(() => {
    // If a FLIP zoom-in transform is currently applied, getBoundingClientRect would
    // return animated (wrong) positions. Clear arrows and defer until animation ends.
    const slide = slideRef.current
    const flipInProgress = !!(slide && slide.style.transform !== '')

    function doCompute() {
      const container = gridAreaRef.current
      if (!container) { setArrows([]); return }
      const containerRect = container.getBoundingClientRect()

      const entrySlots = new Map<string, string[]>()
      for (const entity of current.entities) {
        for (const toId of entity.connections ?? []) {
          if (!entrySlots.has(toId)) entrySlots.set(toId, [])
          entrySlots.get(toId)!.push(entity.id)
        }
      }

      const next: Arrow[] = []
      for (const entity of current.entities) {
        if (!entity.connections?.length) continue
        const fromEl = cardElsMap.current.get(entity.id)
        if (!fromEl) continue
        const exitTotal = entity.connections.length

        for (let exitIdx = 0; exitIdx < entity.connections.length; exitIdx++) {
          const toId = entity.connections[exitIdx]
          const toEl = cardElsMap.current.get(toId)
          if (!toEl) continue

          const entries = entrySlots.get(toId) ?? []
          const entryIdx = Math.max(0, entries.indexOf(entity.id))
          const entryTotal = entries.length

          const obstacles: DOMRect[] = []
          for (const [oid, oel] of cardElsMap.current) {
            if (oid !== entity.id && oid !== toId) obstacles.push(oel.getBoundingClientRect())
          }
          next.push({
            from: entity.id, to: toId,
            d: computeArrowPath(
              fromEl.getBoundingClientRect(), toEl.getBoundingClientRect(),
              obstacles, containerRect,
              exitIdx, exitTotal,
              entryIdx, entryTotal
            )
          })
        }
      }
      setArrows(next)
    }

    if (flipInProgress) {
      // Hide arrows during animation, recompute once transition ends (500ms + buffer)
      setArrows([])
      const timer = setTimeout(doCompute, 520)
      return () => clearTimeout(timer)
    }

    doCompute()
  }, [current.entities, layoutKey, editMode])

  const registerCard = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardElsMap.current.set(id, el)
    else cardElsMap.current.delete(id)
  }, [])

  function drillIn(entity: Entity, cardRect: CardRect) {
    if (!entity.children?.length) return
    pendingFrom.current = cardRect
    setStack(s => [...s, {
      entities: entity.children!.slice(0, 6),
      label: entity.title,
      entity,
      cardRect,
    }])
    setLayoutKey(k => k + 1)
  }

  function addChildAndDrillIn(entity: Entity, cardRect: CardRect) {
    const newChild: Entity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'New Entity',
      description: 'Description',
    }
    onAdd(entity.id, newChild)
    pendingFrom.current = cardRect
    setStack(s => [...s, {
      entities: [newChild],
      label: entity.title,
      entity: { ...entity, children: [newChild] },
      cardRect,
    }])
    setLayoutKey(k => k + 1)
  }

  function goBack(index: number) {
    if (index >= stack.length - 1) return
    const toRect = current.cardRect
    const slide = slideRef.current

    if (toRect && slide) {
      const from = slide.getBoundingClientRect()
      const sx = toRect.width / from.width
      const sy = toRect.height / from.height
      const dx = (toRect.left + toRect.width / 2) - (from.left + from.width / 2)
      const dy = (toRect.top + toRect.height / 2) - (from.top + from.height / 2)

      slide.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.8, 0)'
      slide.style.transformOrigin = 'center center'
      slide.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`

      isAnimating.current = true
      setTimeout(() => {
        isAnimating.current = false
        needsReset.current = true
        setStack(s => s.slice(0, index + 1))
        setLayoutKey(k => k + 1)
      }, 370)
    } else {
      setStack(s => s.slice(0, index + 1))
      setLayoutKey(k => k + 1)
    }
  }

  return (
    <div className={styles.viewer}>
      <nav className={styles.breadcrumb} aria-label="Navigation breadcrumb">
        {stack.map((level, i) => (
          <span key={i} className={styles.crumbItem}>
            {i > 0 && <span className={styles.crumbSep}>/</span>}
            <button
              className={`${styles.crumb} ${i === stack.length - 1 ? styles.crumbActive : ''}`}
              onClick={() => goBack(i)}
              disabled={i === stack.length - 1}
            >
              {level.label}
            </button>
          </span>
        ))}
      </nav>

      {isNested && (
        <div
          className={styles.backdrop}
          onClick={() => { if (!isAnimating.current) goBack(stack.length - 2) }}
          aria-label="Zoom out"
        />
      )}

      {/* slide stays mounted — FLIP transforms this element */}
      <div
        ref={slideRef}
        className={`${styles.slide} ${isNested ? styles.slideCard : ''}`}
      >
        {isNested && current.entity && (
          <div className={styles.slideHeader}>
            {current.entity.icon && (
              <span className={styles.slideIcon}>{current.entity.icon}</span>
            )}
            <div className={styles.slideHeaderText}>
              <h2 className={styles.slideTitle}>{current.entity.title}</h2>
              <p className={styles.slideDescription}>{current.entity.description}</p>
            </div>
          </div>
        )}

        <div ref={gridAreaRef} className={`${styles.gridArea} ${isNested ? styles.gridAreaNested : ''}`}>
          {editMode && (
            <div className={styles.layoutToggle}>
              <button
                className={`${styles.layoutBtn} ${currentLayout === 'tiles' ? styles.layoutBtnActive : ''}`}
                onClick={() => onSetLayout(current.entity?.id ?? null, 'tiles')}
                aria-label="Tiles layout"
                title="Tiles"
              >
                <TilesIcon />
              </button>
              <button
                className={`${styles.layoutBtn} ${currentLayout === 'list' ? styles.layoutBtnActive : ''}`}
                onClick={() => onSetLayout(current.entity?.id ?? null, 'list')}
                aria-label="List layout"
                title="List"
              >
                <ListIcon />
              </button>
            </div>
          )}

          <div
            className={styles.grid}
            data-layout={currentLayout}
            data-count={currentLayout === 'tiles'
              ? current.entities.length + (editMode && current.entities.length < 6 ? 1 : 0)
              : undefined}
          >
            {current.entities.map((entity) => {
              const sourceConnections = connectingFrom
                ? current.entities.find(e => e.id === connectingFrom)?.connections ?? []
                : []
              return (
                <BlockCard
                  key={entity.id}
                  entity={entity}
                  layout={currentLayout}
                  editMode={editMode}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddChild={addChildAndDrillIn}
                  onDrillIn={drillIn}
                  connectingFrom={connectingFrom}
                  isConnected={sourceConnections.includes(entity.id)}
                  onStartConnect={(id) => setConnectingFrom(id === connectingFrom ? null : id)}
                  onConnectTarget={() => {
                    if (!connectingFrom) return
                    const already = sourceConnections.includes(entity.id)
                    if (already) onDisconnect(connectingFrom, entity.id)
                    else onConnect(connectingFrom, entity.id)
                    setConnectingFrom(null)
                  }}
                  onRegisterEl={registerCard}
                />
              )
            })}
            {editMode && current.entities.length < 6 && (
              <button
                className={styles.addBlock}
                onClick={() => onAdd(current.entity?.id ?? null)}
                aria-label="Add entity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>

          {arrows.length > 0 && (
            <svg className={styles.arrowSvg} aria-hidden="true">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M 0 0 L 10 4 L 0 8 Z" fill="#3d6aff" />
                </marker>
              </defs>
              {arrows.map((a, i) => (
                <path key={i} d={a.d} fill="none" stroke="#3d6aff" strokeWidth="2" strokeOpacity="0.7" markerEnd="url(#arrowhead)" />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

function TilesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
