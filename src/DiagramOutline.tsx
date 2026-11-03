import type { Block, TakeSixDocument } from '@takesix/core'

// The whole diagram as nested lists. The viewer shows one level at a time, so
// crawlers and screen readers would otherwise never reach the inner blocks.
// Hidden by default: sighted readers get the same text by clicking through.
// Example pages show it openly as a text version.

export function DiagramOutline({ document: doc, visible = false }: { document: TakeSixDocument; visible?: boolean }) {
  if (visible) return <Blocks blocks={doc.blocks} />
  return (
    <section className="sr-only" aria-label={`${doc.title}, text version`}>
      <h2>{doc.title}</h2>
      {doc.description && <p>{doc.description}</p>}
      <Blocks blocks={doc.blocks} />
    </section>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <ul>
      {blocks.map(b => (
        <li key={b.id}>
          <strong>{b.title}</strong>
          {b.description && `: ${b.description}`}
          {b.details && <p>{b.details}</p>}
          {b.children && b.children.length > 0 && <Blocks blocks={b.children} />}
        </li>
      ))}
    </ul>
  )
}
