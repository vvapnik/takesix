import { ExamplePage } from './ExamplePage'

export function TodoPage() {
  return (
    <ExamplePage
      name="todo"
      heading="A to-do list as a diagram"
      intro={
        <p>
          A to-do list as a TakeSix diagram: five stages in order, a status on every task, the details one click
          away. The first screen answers “where are we?”; each stage opens into its tasks. Works the same for project
          plans and roadmaps that an agent keeps up to date.
        </p>
      }
      prompt="Turn our launch checklist into a TakeSix to-do diagram: stages in order from left to right with space between them, tasks inside each stage, and ✅ ⏳ ○ for done, in progress and not started."
    />
  )
}
