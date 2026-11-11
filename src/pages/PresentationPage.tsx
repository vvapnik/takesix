import { ExamplePage } from './ExamplePage'

export function PresentationPage() {
  return (
    <ExamplePage
      name="presentation"
      heading="A talk you can click through"
      intro={
        <p>
          A talk as a TakeSix diagram: the outline in the order you speak, on one screen, and each part opening into
          what it says, with the speaker notes one click deeper. Present it by clicking from part to part; after the
          talk, people read the same diagram at their own pace instead of a deck without the speaker.
        </p>
      }
      prompt="Turn the notes for my talk into a TakeSix presentation: the parts in the order of the talk as a staircase, each part opening into one block per slide, speaker notes in the details."
    />
  )
}
