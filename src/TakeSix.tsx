import { useState } from 'react'
import { Viewer } from './Viewer'
import type { Entity, Layout } from './types'
import styles from './TakeSix.module.css'

function updateInTree(entities: Entity[], id: string, changes: Partial<Entity>): Entity[] {
  return entities.map(e => {
    if (e.id === id) return { ...e, ...changes }
    if (e.children?.length) return { ...e, children: updateInTree(e.children, id, changes) }
    return e
  })
}

function deleteFromTree(entities: Entity[], id: string): Entity[] {
  return entities
    .filter(e => e.id !== id)
    .map(e => e.children?.length ? { ...e, children: deleteFromTree(e.children, id) } : e)
}

function addToTree(entities: Entity[], parentId: string | null, entity: Entity): Entity[] {
  if (parentId === null) return [...entities, entity]
  return entities.map(e => {
    if (e.id === parentId) return { ...e, children: [...(e.children ?? []), entity] }
    if (e.children?.length) return { ...e, children: addToTree(e.children, parentId, entity) }
    return e
  })
}

function connectInTree(entities: Entity[], fromId: string, toId: string): Entity[] {
  return entities.map(e => {
    if (e.id === fromId) {
      const connections = e.connections ?? []
      if (connections.includes(toId)) return e
      return { ...e, connections: [...connections, toId] }
    }
    if (e.children?.length) return { ...e, children: connectInTree(e.children, fromId, toId) }
    return e
  })
}

function disconnectInTree(entities: Entity[], fromId: string, toId: string): Entity[] {
  return entities.map(e => {
    if (e.id === fromId) return { ...e, connections: (e.connections ?? []).filter(id => id !== toId) }
    if (e.children?.length) return { ...e, children: disconnectInTree(e.children, fromId, toId) }
    return e
  })
}

interface Props {
  entities: Entity[]
  onChange: (entities: Entity[]) => void
}

export function TakeSix({ entities, onChange }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [rootLayout, setRootLayout] = useState<Layout>('tiles')

  function onUpdate(id: string, changes: Partial<Entity>) {
    onChange(updateInTree(entities, id, changes))
  }

  function onDelete(id: string) {
    onChange(deleteFromTree(entities, id))
  }

  function onAdd(parentId: string | null, entity?: Entity) {
    const newEntity = entity ?? {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'New Entity',
      description: 'Description',
    }
    onChange(addToTree(entities, parentId, newEntity))
  }

  function onSetLayout(id: string | null, layout: Layout) {
    if (id === null) setRootLayout(layout)
    else onChange(updateInTree(entities, id, { layout }))
  }

  function onConnect(fromId: string, toId: string) {
    onChange(connectInTree(entities, fromId, toId))
  }

  function onDisconnect(fromId: string, toId: string) {
    onChange(disconnectInTree(entities, fromId, toId))
  }

  return (
    <div className={styles.takeSix}>
      <button
        className={`${styles.modeToggle} ${editMode ? styles.modeToggleEdit : ''}`}
        onClick={() => setEditMode(m => !m)}
        aria-label={editMode ? 'Save' : 'Edit'}
      >
        {editMode ? <><SaveIcon />Save</> : <><PencilIcon />Edit</>}
      </button>

      <Viewer
        root={entities}
        editMode={editMode}
        rootLayout={rootLayout}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAdd={onAdd}
        onSetLayout={onSetLayout}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}
