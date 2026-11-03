// Checks the diagrams the site shows, so a broken one fails CI instead of the page.
import { readFileSync } from 'node:fs'
import { formatIssues, lintLayout, parseDocument } from '@takesix/core'

const files = ['src/takesix.takesix.json', 'src/examples/architecture.takesix.json', 'src/examples/todo.takesix.json']
let failed = false
for (const file of files) {
  const result = parseDocument(readFileSync(file, 'utf8'))
  if (result.issues.length) console.error(`${file}:\n${formatIssues(result.issues)}`)
  if (!result.ok) failed = true
  else {
    console.log(`${file}: OK`)
    // Valid, but reads worse: arrows with a block in their way, arrows that cross
    const hints = lintLayout(result.document)
    if (hints.length) console.warn(`${file}: layout hints\n${formatIssues(hints)}`)
  }
}
process.exit(failed ? 1 : 0)
