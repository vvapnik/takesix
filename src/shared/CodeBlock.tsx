import { useCopy } from './useCopy'

/** A block of code or a command, with a Copy button. `wrap` breaks long lines (prose, prompts). */
export function CodeBlock({ code, label, wrap = false }: { code: string; label?: string; wrap?: boolean }) {
  const { copied, copy } = useCopy(code)
  return (
    <div className={`code-block${wrap ? ' wrap' : ''}`}>
      {label && <span className="code-label">{label}</span>}
      <pre>
        <code>{code}</code>
      </pre>
      <button type="button" onClick={copy} aria-label={label ? `Copy: ${label}` : 'Copy'}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
