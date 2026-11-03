import { parseDocument, type TakeSixDocument } from '@takesix/core'
import takesixSource from '../takesix.takesix.json?raw'
import architectureSource from './architecture.takesix.json?raw'
import todoSource from './todo.takesix.json?raw'

// The diagrams the site shows. The editor opens one of them by name:
// /editor/?example=architecture

function parse(name: string, source: string): TakeSixDocument {
  const result = parseDocument(source)
  if (!result.ok) throw new Error(`Example "${name}" is not a valid takesix document: run npm run validate`)
  return result.document
}

export const EXAMPLES = {
  takesix: parse('takesix', takesixSource),
  architecture: parse('architecture', architectureSource),
  todo: parse('todo', todoSource),
}

export type ExampleName = keyof typeof EXAMPLES

export function isExampleName(name: string | null): name is ExampleName {
  return name !== null && Object.hasOwn(EXAMPLES, name)
}
