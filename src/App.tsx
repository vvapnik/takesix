import { useState } from 'react'
import { Viewer } from './Viewer'
import { sampleData } from './sample-data'
import type { Entity, Layout } from './types'
import styles from './App.module.css'

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

export function App() {
  const [data, setData] = useState<Entity[]>(sampleData)
  const [editMode, setEditMode] = useState(false)
  const [rootLayout, setRootLayout] = useState<Layout>('tiles')

  function onUpdate(id: string, changes: Partial<Entity>) {
    setData(prev => updateInTree(prev, id, changes))
  }

  function onDelete(id: string) {
    setData(prev => deleteFromTree(prev, id))
  }

  function onAdd(parentId: string | null, entity?: Entity) {
    const newEntity = entity ?? {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'New Entity',
      description: 'Description',
    }
    setData(prev => addToTree(prev, parentId, newEntity))
  }

  function onSetLayout(id: string | null, layout: Layout) {
    if (id === null) setRootLayout(layout)
    else setData(prev => updateInTree(prev, id, { layout }))
  }

  return (
    <div className={styles.app}>
      <button
        className={`${styles.modeToggle} ${editMode ? styles.modeToggleEdit : ''}`}
        onClick={() => setEditMode(m => !m)}
        aria-label={editMode ? 'Save' : 'Edit'}
      >
        {editMode ? <><SaveIcon />Save</> : <><PencilIcon />Edit</>}
      </button>

      <Viewer
        root={data}
        editMode={editMode}
        rootLayout={rootLayout}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAdd={onAdd}
        onSetLayout={onSetLayout}
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
