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

type Edge = 'left' | 'right' | 'top' | 'bottom'

function determineEdges(
  fromRect: DOMRect,
  toRect: DOMRect,
  obstacleRects: DOMRect[],
): { exitEdge: Edge; entryEdge: Edge } {
  const fromCX = (fromRect.left + fromRect.right) / 2
  const fromCY = (fromRect.top + fromRect.bottom) / 2
  const toCX = (toRect.left + toRect.right) / 2
  const toCY = (toRect.top + toRect.bottom) / 2
  const dx = toCX - fromCX
  const dy = toCY - fromCY

  const sameRow = Math.abs(dy) < Math.min(fromRect.height, toRect.height) * 0.5
  if (sameRow) {
    const goRight = dx >= 0
    const blocked = obstacleRects.some(r => {
      const rCX = (r.left + r.right) / 2
      const inX = goRight
        ? rCX > fromRect.right - 4 && rCX < toRect.left + 4
        : rCX < fromRect.left + 4 && rCX > toRect.right - 4
      const inY = Math.abs((r.top + r.bottom) / 2 - fromCY) < (fromRect.height + r.height) * 0.4
      return inX && inY
    })
    if (!blocked) {
      return { exitEdge: goRight ? 'right' : 'left', entryEdge: goRight ? 'left' : 'right' }
    }
    return { exitEdge: 'bottom', entryEdge: 'bottom' }
  }

  const goDown = dy > 0
  return { exitEdge: goDown ? 'bottom' : 'top', entryEdge: goDown ? 'top' : 'bottom' }
}

function edgePoint(
  rect: DOMRect, edge: Edge, idx: number, total: number, cl: number, ct: number,
): { x: number; y: number } {
  const cx = (rect.left + rect.right) / 2
  const cy = (rect.top + rect.bottom) / 2
  switch (edge) {
    case 'right':  return { x: rect.right  - cl, y: cy - ct + slotPos(idx, total, rect.height) }
    case 'left':   return { x: rect.left   - cl, y: cy - ct + slotPos(idx, total, rect.height) }
    case 'bottom': return { x: cx - cl + slotPos(idx, total, rect.width), y: rect.bottom - ct }
    case 'top':    return { x: cx - cl + slotPos(idx, total, rect.width), y: rect.top    - ct }
  }
}

function computeArrowPath(
  fromRect: DOMRect,
  toRect: DOMRect,
  containerRect: DOMRect,
  exitEdge: Edge, exitIdx: number, exitTotal: number,
  entryEdge: Edge, entryIdx: number, entryTotal: number,
): string {
  const cl = containerRect.left
  const ct = containerRect.top
  const { x: x1, y: y1 } = edgePoint(fromRect, exitEdge, exitIdx, exitTotal, cl, ct)
  const { x: x2, y: y2 } = edgePoint(toRect,   entryEdge, entryIdx, entryTotal, cl, ct)

  if (exitEdge === 'bottom' && entryEdge === 'bottom') {
    const arcY = Math.max(y1, y2) + 32
    return `M ${x1} ${y1} C ${x1} ${arcY}, ${x2} ${arcY}, ${x2} ${y2}`
  }

  if (exitEdge === 'right' || exitEdge === 'left') {
    const toCX = (toRect.left + toRect.right) / 2
    const fromCX = (fromRect.left + fromRect.right) / 2
    const s = exitEdge === 'right' ? 1 : -1
    const offset = Math.min(Math.abs(toCX - fromCX) * 0.4, 80)
    return `M ${x1} ${y1} C ${x1 + s * offset} ${y1}, ${x2 - s * offset} ${y2}, ${x2} ${y2}`
  }

  const fromEdgeY = exitEdge === 'bottom' ? fromRect.bottom : fromRect.top
  const toEdgeY   = entryEdge === 'top'   ? toRect.top     : toRect.bottom
  const midY = (fromEdgeY + toEdgeY) / 2 - ct
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

export function Viewer({ root, editMode, rootLayout, onUpdate, onDelete, onAdd, onSetLayout, onConnect, onDisconnect }: Props) {
  const slideRef = useRef<HTMLDivElement>(null)
  const pendingFrom = useRef<CardRect | null>(null)
  const needsReset = useRef(false)
  const isAnimating = useRef(false)
  const cardElsMap = useRef(new Map<string, HTMLDivElement>())
  const gridAreaRef = useRef<HTMLDivElement>(null)
  const circleContainerRef = useRef<HTMLDivElement>(null)

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [arrows, setArrows] = useState<Arrow[]>([])
  const [circleSize, setCircleSize] = useState({ w: 0, h: 0 })

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

      // First pass: collect all connections with their rects and resolved edges
      interface ConnInfo {
        fromId: string; toId: string
        fromRect: DOMRect; toRect: DOMRect
        exitEdge: Edge; entryEdge: Edge
      }
      const conns: ConnInfo[] = []
      for (const entity of current.entities) {
        if (!entity.connections?.length) continue
        const fromEl = cardElsMap.current.get(entity.id)
        if (!fromEl) continue
        const fromRect = fromEl.getBoundingClientRect()
        for (const toId of entity.connections) {
          const toEl = cardElsMap.current.get(toId)
          if (!toEl) continue
          const toRect = toEl.getBoundingClientRect()
          const obstacles: DOMRect[] = []
          for (const [oid, oel] of cardElsMap.current) {
            if (oid !== entity.id && oid !== toId) obstacles.push(oel.getBoundingClientRect())
          }
          const { exitEdge, entryEdge } = determineEdges(fromRect, toRect, obstacles)
          conns.push({ fromId: entity.id, toId, fromRect, toRect, exitEdge, entryEdge })
        }
      }

      // Build combined per-card-edge slot pools. Exits and entries on the same
      // edge of the same card share a single pool so they never overlap.
      const edgePools = new Map<string, Array<{ ci: number; role: 'exit' | 'entry' }>>()
      for (let ci = 0; ci < conns.length; ci++) {
        const { fromId, toId, exitEdge, entryEdge } = conns[ci]
        const ek = `${fromId}-${exitEdge}`
        if (!edgePools.has(ek)) edgePools.set(ek, [])
        edgePools.get(ek)!.push({ ci, role: 'exit' })
        const nk = `${toId}-${entryEdge}`
        if (!edgePools.has(nk)) edgePools.set(nk, [])
        edgePools.get(nk)!.push({ ci, role: 'entry' })
      }

      // Second pass: compute paths using combined slot indices
      const next: Arrow[] = []
      for (let ci = 0; ci < conns.length; ci++) {
        const { fromId, toId, fromRect, toRect, exitEdge, entryEdge } = conns[ci]
        const exitPool  = edgePools.get(`${fromId}-${exitEdge}`)!
        const entryPool = edgePools.get(`${toId}-${entryEdge}`)!
        const exitIdx  = exitPool.findIndex(s => s.ci === ci && s.role === 'exit')
        const entryIdx = entryPool.findIndex(s => s.ci === ci && s.role === 'entry')
        next.push({
          from: fromId, to: toId,
          d: computeArrowPath(
            fromRect, toRect, containerRect,
            exitEdge, exitIdx, exitPool.length,
            entryEdge, entryIdx, entryPool.length,
          ),
        })
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

  useEffect(() => {
    if (currentLayout !== 'circle') return
    const el = circleContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCircleSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [currentLayout])

  const registerCard = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardElsMap.current.set(id, el)
    else cardElsMap.current.delete(id)
  }, [])

  const circlePositions: Array<{ x: number; y: number }> = (() => {
    if (currentLayout !== 'circle' || circleSize.w === 0) return []
    const { w, h } = circleSize
    const n = current.entities.length
    const r = Math.min(w, h) * 0.38
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2
      return { x: w / 2 + r * Math.cos(angle), y: h / 2 + r * Math.sin(angle) }
    })
  })()

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
              <button
                className={`${styles.layoutBtn} ${currentLayout === 'circle' ? styles.layoutBtnActive : ''}`}
                onClick={() => onSetLayout(current.entity?.id ?? null, 'circle')}
                aria-label="Circle layout"
                title="Circle"
              >
                <CircleLayoutIcon />
              </button>
            </div>
          )}

          {currentLayout === 'circle' ? (
            <div ref={circleContainerRef} className={styles.circleGrid}>
              {current.entities.map((entity, i) => {
                const pos = circlePositions[i]
                const sourceConnections = connectingFrom
                  ? current.entities.find(e => e.id === connectingFrom)?.connections ?? []
                  : []
                return (
                  <div
                    key={entity.id}
                    className={styles.circleItem}
                    style={pos ? { left: pos.x, top: pos.y } : { visibility: 'hidden' }}
                  >
                    <BlockCard
                      entity={entity}
                      layout="tiles"
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
                  </div>
                )
              })}
              {editMode && current.entities.length < 6 && (
                <button
                  className={`${styles.addBlock} ${styles.addBlockCenter}`}
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
          ) : (
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
          )}

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

function CircleLayoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="2.5" r="2" />
      <circle cx="19.8" cy="7" r="2" />
      <circle cx="19.8" cy="17" r="2" />
      <circle cx="12" cy="21.5" r="2" />
      <circle cx="4.2" cy="17" r="2" />
      <circle cx="4.2" cy="7" r="2" />
    </svg>
  )
}
