import { useEffect, useRef, useState } from 'react'
import { addJourney, createDocument, formatIssues, parseDocument, serializeDocument, type JourneyAddress, type TakeSixDocument } from '@takesix/core'
import { createEditorLink, readDocumentFromHash, TakeSix, type Theme } from '@takesix/react'
import { EXAMPLES, isExampleName } from '../examples'
import { JourneysMenu } from '../shared/JourneysMenu'
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
  // The Save menu: JSON, HTML or a link
  const [saveOpen, setSaveOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const saveRef = useRef<HTMLDivElement>(null)
  // Remount the viewer on New/Open so navigation starts at the top level.
  const [version, setVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // The journey on screen: started from the toolbar or the viewer's own controls
  const [journey, setJourney] = useState<JourneyAddress | null>(null)

  function newJourney() {
    const { document: next, journey: created } = addJourney(doc, { title: `Journey ${(doc.journeys?.length ?? 0) + 1}` })
    change(next)
    setJourney({ journey: created.id, step: 0 })
  }

  function load(next: TakeSixDocument) {
    if (dirty && !window.confirm('Discard the changes you have not saved?')) return
    setDoc(next)
    setVersion(v => v + 1)
    setJourney(null)
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

  function download(text: string, type: string, name: string) {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    // Some browsers start the download after click() returns
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function saveJson() {
    setSaveOpen(false)
    download(serializeDocument(doc), 'application/json', fileName(doc))
    setDirty(false)
  }

  // A page that opens as the diagram on its own. The viewer inside it (~300 KB
  // with React) is a separate chunk, loaded only when someone saves HTML.
  async function saveHtml() {
    setSaveOpen(false)
    const { standaloneHtml } = await import('@takesix/react/standalone')
    download(standaloneHtml(doc), 'text/html', fileName(doc).replace(/\.takesix\.json$/, '.html'))
  }

  // A link to this editor with the diagram inside (#takesix=...), copied to the clipboard
  async function copyLink() {
    setSaveOpen(false)
    try {
      const link = await createEditorLink(doc, window.location.origin + window.location.pathname)
      if (!link) { setError('This diagram is too big to open by link: save it as JSON or HTML.'); return }
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
    } catch (e) {
      setError(`Could not copy the link: ${(e as Error).message}`)
    }
  }

  useEffect(() => {
    if (!linkCopied) return
    const timer = setTimeout(() => setLinkCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [linkCopied])

  // The Save menu closes on Escape and on a click outside
  useEffect(() => {
    if (!saveOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSaveOpen(false) }
    const onPointer = (e: PointerEvent) => { if (!saveRef.current?.contains(e.target as Node)) setSaveOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [saveOpen])

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
          <div ref={saveRef} className="dropdown">
            <button type="button" aria-haspopup="menu" aria-expanded={saveOpen} onClick={() => setSaveOpen(o => !o)}>
              {linkCopied ? 'Link copied' : `Save${dirty ? ' •' : ''}`}
            </button>
            {saveOpen && (
              <div className="dropdown-menu" role="menu" aria-label="Save">
                <button type="button" role="menuitem" onClick={saveJson}>JSON</button>
                <button type="button" role="menuitem" onClick={saveHtml} title="One HTML file that opens as the diagram without a server">
                  HTML
                </button>
                <button type="button" role="menuitem" onClick={copyLink} title="Copies a link to this editor with the diagram inside">
                  Link
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Open…
          </button>
          <JourneysMenu
            document={doc}
            active={journey?.journey}
            onStart={id => setJourney({ journey: id, step: 0 })}
            onCreate={newJourney}
          />
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
        <TakeSix
          key={version}
          document={doc}
          onChange={change}
          editing={editing}
          theme={theme}
          journey={journey}
          onJourneyChange={setJourney}
        />
      </main>

      <p className="drop-hint" aria-hidden="true">
        Drop a .takesix.json file to open it
      </p>
    </div>
  )
}
