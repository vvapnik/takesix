import { useState, useEffect, useRef, useLayoutEffect } from 'react'
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

export function Viewer({ root, editMode, rootLayout, onUpdate, onDelete, onAdd, onSetLayout }: Props) {
  const slideRef = useRef<HTMLDivElement>(null)
  const pendingFrom = useRef<CardRect | null>(null)
  const needsReset = useRef(false)
  const isAnimating = useRef(false)

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

        <div className={`${styles.gridArea} ${isNested ? styles.gridAreaNested : ''}`}>
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
            {current.entities.map((entity) => (
              <BlockCard key={entity.id} entity={entity} layout={currentLayout} editMode={editMode} onUpdate={onUpdate} onDelete={onDelete} onAddChild={addChildAndDrillIn} onDrillIn={drillIn} />
            ))}
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
