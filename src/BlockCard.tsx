import { useEffect, useRef } from 'react'
import type { Entity, Layout } from './types'
import styles from './BlockCard.module.css'

export interface CardRect {
  left: number; top: number; width: number; height: number
}

type UpdateFn = (id: string, changes: Partial<Pick<Entity, 'title' | 'description'>>) => void

interface Props {
  entity: Entity
  layout: Layout
  editMode: boolean
  onUpdate: UpdateFn
  onDelete: (id: string) => void
  onAddChild: (entity: Entity, cardRect: CardRect) => void
  onDrillIn: (entity: Entity, cardRect: CardRect) => void
  connectingFrom: string | null
  isConnected: boolean
  onStartConnect: (id: string) => void
  onConnectTarget: () => void
  onRegisterEl: (id: string, el: HTMLDivElement | null) => void
}

export function BlockCard({ entity, layout, editMode, onUpdate, onDelete, onAddChild, onDrillIn, connectingFrom, isConnected, onStartConnect, onConnectTarget, onRegisterEl }: Props) {
  const hasChildren = entity.children && entity.children.length > 0
  const count = Math.min(entity.children?.length ?? 0, 6)
  const cardEl = useRef<HTMLDivElement>(null)

  const isConnectingSource = connectingFrom === entity.id
  const isConnectable = connectingFrom !== null && connectingFrom !== entity.id

  const onRegisterElRef = useRef(onRegisterEl)
  onRegisterElRef.current = onRegisterEl

  useEffect(() => {
    onRegisterElRef.current(entity.id, cardEl.current)
    return () => { onRegisterElRef.current(entity.id, null) }
  }, [entity.id])

  function stopPropIfEdit(e: React.MouseEvent) {
    if (editMode) e.stopPropagation()
  }

  function getCardRect(): CardRect {
    const r = cardEl.current!.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  let cardClass = styles.card
  if (layout === 'list') cardClass += ` ${styles.cardList}`
  if (isConnectingSource) cardClass += ` ${styles.cardConnectingSource}`
  else if (isConnectable && isConnected) cardClass += ` ${styles.cardConnected}`
  else if (isConnectable) cardClass += ` ${styles.cardConnectable}`

  return (
    <div className={cardClass} ref={cardEl}>
      {/* Transparent overlay that captures clicks when this card is a connection target */}
      {isConnectable && (
        <div
          className={`${styles.connectOverlay} ${isConnected ? styles.connectOverlayConnected : ''}`}
          onClick={e => { e.stopPropagation(); onConnectTarget() }}
          aria-label={isConnected ? `Disconnect from ${entity.title}` : `Connect to ${entity.title}`}
        />
      )}

      {editMode && (
        <button
          className={styles.deleteBtn}
          onClick={e => { e.stopPropagation(); onDelete(entity.id) }}
          aria-label={`Delete ${entity.title}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {editMode && (
        <button
          className={`${styles.connectBtn} ${isConnectingSource ? styles.connectBtnActive : ''}`}
          onClick={e => { e.stopPropagation(); onStartConnect(entity.id) }}
          aria-label={isConnectingSource ? 'Cancel connection' : `Connect from ${entity.title}`}
          title={isConnectingSource ? 'Cancel' : 'Connect to another entity'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      )}

      <div className={styles.header}>
        {entity.icon && <span className={styles.icon}>{entity.icon}</span>}
        <div className={styles.headerText}>
          <h2
            key={`title-${editMode}`}
            className={`${styles.title} ${editMode ? styles.editable : ''}`}
            contentEditable={editMode || undefined}
            suppressContentEditableWarning
            onClick={stopPropIfEdit}
            onKeyDown={editMode ? e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } } : undefined}
            onBlur={editMode ? e => onUpdate(entity.id, { title: e.currentTarget.textContent?.trim() ?? '' }) : undefined}
          >
            {entity.title}
          </h2>
          <p
            key={`desc-${editMode}`}
            className={`${styles.description} ${editMode ? styles.editable : ''}`}
            contentEditable={editMode || undefined}
            suppressContentEditableWarning
            onClick={stopPropIfEdit}
            onBlur={editMode ? e => onUpdate(entity.id, { description: e.currentTarget.textContent?.trim() ?? '' }) : undefined}
          >
            {entity.description}
          </p>
        </div>
      </div>

      {hasChildren && (
        <button
          className={styles.childrenSection}
          aria-label={`Zoom into children of ${entity.title}`}
          onClick={() => {
            if (!cardEl.current) return
            onDrillIn(entity, getCardRect())
          }}
        >
          <div className={styles.miniGrid} data-count={count} data-layout={entity.layout ?? 'tiles'}>
            {entity.children!.slice(0, 6).map((child) => (
              <div key={child.id} className={styles.miniCard}>
                {child.icon && <span className={styles.miniIcon}>{child.icon}</span>}
                <div className={styles.miniText}>
                  <span className={styles.miniTitle}>{child.title}</span>
                  <span className={styles.miniDescription}>{child.description}</span>
                </div>
              </div>
            ))}
          </div>
        </button>
      )}

      {!hasChildren && editMode && (
        <button
          className={styles.addChildBtn}
          onClick={e => {
            e.stopPropagation()
            if (!cardEl.current) return
            onAddChild(entity, getCardRect())
          }}
          aria-label={`Add child to ${entity.title}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
    </div>
  )
}
