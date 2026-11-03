import { useState } from 'react'

/** Copies text to the clipboard; `copied` stays true for a moment after. */
export function useCopy(text: string) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked: the text stays selectable.
    }
  }

  return { copied, copy }
}
