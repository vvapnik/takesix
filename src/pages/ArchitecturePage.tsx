import { ExamplePage } from './ExamplePage'

export function ArchitecturePage() {
  return (
    <ExamplePage
      name="architecture"
      heading="An architecture diagram you can click into"
      intro={
        <p>
          An architecture overview usually ends up as one huge diagram nobody can read, or a dozen pages of docs. Here
          the whole system fits on one screen: the layers a request passes through run from top to bottom, and
          operations stand beside them. Click a block to see its parts; its details open next to it.
        </p>
      }
      prompt="Explain the architecture of this repository as a TakeSix diagram: the main layers on the first screen, their parts inside, and only the links that matter."
    />
  )
}
