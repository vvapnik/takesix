import type { ReactNode } from 'react'
import { serializeDocument, type TakeSixDocument } from '@takesix/core'
import { TakeSix } from '@takesix/react'
import { EXAMPLES, type ExampleName } from '../examples'
import { DiagramOutline } from '../DiagramOutline'
import { SiteHeader } from '../shared/SiteHeader'
import { SiteFooter } from '../shared/SiteFooter'
import { CodeBlock } from '../shared/CodeBlock'

interface ExamplePageProps {
  name: ExampleName
  /** The page heading; the diagram shows its own title right below. */
  heading: string
  intro: ReactNode
  /** What to ask an agent for a diagram like this one. */
  prompt: string
}

const OTHERS: { name: ExampleName; href: string; title: string; note: string }[] = [
  { name: 'architecture', href: '/examples/architecture/', title: 'Architecture', note: 'A SaaS web app, part by part' },
  { name: 'todo', href: '/examples/todo/', title: 'To-do list', note: 'Launch a website, with statuses' },
  { name: 'takesix', href: '/#demo', title: 'TakeSix itself', note: 'The diagram on the home page' },
]

/** Saves the diagram as a file, built from the document itself. */
function download(doc: TakeSixDocument, name: string) {
  const url = URL.createObjectURL(new Blob([serializeDocument(doc)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.takesix.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** One example diagram: what it shows, the live diagram, its text version and how to get one from an agent. */
export function ExamplePage({ name, heading, intro, prompt }: ExamplePageProps) {
  const doc = EXAMPLES[name]
  return (
    <div className="page">
      <SiteHeader />
      <main>
        <section className="example-head">
          <p className="kicker">Example</p>
          <h1>{heading}</h1>
          <div className="lead">{intro}</div>
          <div className="actions">
            <a className="primary" href={`/editor/?example=${name}`}>
              Open in the editor
            </a>
            <button type="button" className="secondary" onClick={() => download(doc, name)}>
              Download .takesix.json
            </button>
          </div>
        </section>

        <section className="example-view" aria-label={`${doc.title}, live diagram`}>
          <TakeSix document={doc} />
        </section>

        <section className="example-text">
          <h2>Get one like it from your agent</h2>
          <p>
            With the TakeSix MCP server or skill connected (<a href="/agents/">see the guide</a>), ask in plain
            words:
          </p>
          <CodeBlock code={prompt} label="Prompt" wrap />

          <details className="text-version">
            <summary>Read this diagram as text</summary>
            <DiagramOutline document={doc} visible />
          </details>
        </section>

        <section className="example-more">
          <h2>More examples</h2>
          <ul>
            {OTHERS.filter(o => o.name !== name).map(o => (
              <li key={o.name}>
                <a href={o.href}>
                  <span>{o.title}</span>
                  <small>{o.note}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
