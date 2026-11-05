import { useEffect, useRef, useState } from 'react'
import { createDocument, formatIssues, parseDocument, serializeDocument, type TakeSixDocument } from '@takesix/core'
import { readDocumentFromHash, TakeSix, type Theme } from '@takesix/react'
import { EXAMPLES, isExampleName } from '../examples'
// Inlined so the logo takes the text colour (it draws with currentColor)
import logoSvg from '../logo.svg?raw'

// A manual editor with no backend: documents are opened from and saved to
// files on the user's computer, nothing is uploaded. "Open in editor" in a
// viewer passes the document in the URL fragment (#takesix=...), which stays
// in the browser too.

const EXAMPLE = EXAMPLES.takesix

/** ?example=architecture opens that example; anything else opens the TakeSix diagram. */
function initialDocument(): TakeSixDocument {
  const name = new URLSearchParams(window.location.search).get('example')
  return isExampleName(name) ? EXAMPLES[name] : EXAMPLE
}

const THEMES: Theme[] = ['auto', 'light', 'dark']

/** File name for a document: its title in kebab case. */
function fileName(doc: TakeSixDocument): string {
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'diagram'}.takesix.json`
}

export function Editor() {
  const [doc, setDoc] = useState<TakeSixDocument>(initialDocument)
  const [editing, setEditing] = useState(true)
  const [theme, setTheme] = useState<Theme>('auto')
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Remount the viewer on New/Open so navigation starts at the top level.
  const [version, setVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function load(next: TakeSixDocument) {
    if (dirty && !window.confirm('Discard the changes you have not saved?')) return
    setDoc(next)
    setVersion(v => v + 1)
    setDirty(false)
    setError(null)
  }

  function open(text: string, name: string) {
    let result
    try {
      result = parseDocument(text)
    } catch (e) {
      setError(`${name} is not JSON: ${(e as Error).message}`)
      return
    }
    if (result.ok) load(result.document)
    else setError(`${name} is not a valid TakeSix document:\n${formatIssues(result.issues)}`)
  }

  async function openFile(file: File | undefined) {
    if (file) open(await file.text(), file.name)
  }

  function save() {
    const blob = new Blob([serializeDocument(doc)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName(doc)
    a.click()
    URL.revokeObjectURL(url)
    setDirty(false)
  }

  function change(next: TakeSixDocument) {
    setDoc(next)
    setDirty(true)
  }

  // A document passed in the URL fragment: open it, then drop the fragment
  // from the address bar, it can be long. Edits are saved with Save as usual.
  useEffect(() => {
    if (!window.location.hash) return
    let current = true
    readDocumentFromHash(window.location.hash).then(
      data => {
        if (!current || data === undefined) return
        history.replaceState(null, '', window.location.pathname + window.location.search)
        const result = parseDocument(data)
        if (result.ok) load(result.document)
        else setError(`The linked diagram is not a valid TakeSix document:\n${formatIssues(result.issues)}`)
      },
      () => { if (current) setError('The link is damaged: the diagram in it could not be read.') },
    )
    return () => { current = false }
    // Once, on opening the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The page chrome follows the same theme as the diagram.
  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [theme])

  // Unsaved edits live only in this tab: warn before closing it.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return (
    <div
      className={`editor${dragging ? ' dragging' : ''}`}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={e => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={e => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragging(false)
        void openFile(e.dataTransfer.files[0])
      }}
    >
      <header className="toolbar">
        <a className="brand" href="/" aria-label="TakeSix home">
          <span className="logo" dangerouslySetInnerHTML={{ __html: logoSvg }} />
          TakeSix
        </a>
        <span className="toolbar-title">Editor</span>
        <div className="toolbar-group">
          <button type="button" onClick={() => load(createDocument({ title: 'Untitled' }))}>
            New
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Open…
          </button>
          <button type="button" onClick={save}>
            Save{dirty ? ' •' : ''}
          </button>
          <button type="button" onClick={() => load(EXAMPLE)}>
            Example
          </button>
        </div>
        <div className="toolbar-group end">
          <button
            type="button"
            onClick={() => setTheme(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]!)}
            title="Colour theme: auto follows the system"
          >
            Theme: {theme[0]!.toUpperCase() + theme.slice(1)}
          </button>
          <button type="button" className="toggle" aria-pressed={editing} onClick={() => setEditing(e => !e)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={e => {
            const file = e.target.files?.[0]
            // Reset so the same file can be opened again
            e.target.value = ''
            void openFile(file)
          }}
        />
      </header>

      {error && (
        <div className="error" role="alert">
          <pre>{error}</pre>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <main className="canvas">
        <TakeSix key={version} document={doc} onChange={change} editing={editing} theme={theme} />
      </main>

      <p className="drop-hint" aria-hidden="true">
        Drop a .takesix.json file to open it
      </p>
    </div>
  )
}
