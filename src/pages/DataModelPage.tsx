import { ExamplePage } from './ExamplePage'

export function DataModelPage() {
  return (
    <ExamplePage
      name="data-model"
      heading="A data model you can click into"
      intro={
        <p>
          A data model drawn as one big ER diagram shows every column of every table at once. Here the first screen
          shows only the tables and how they relate: the order in the middle, everything it touches around it. Open a
          table to read its columns, or the order to see the tables it is made of.
        </p>
      }
      prompt="Explain the data model of this project as a TakeSix diagram: the central table in the middle, the tables it relates to around it with labelled arrows, and the columns of each table inside it."
    />
  )
}
