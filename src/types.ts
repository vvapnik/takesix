export type Layout = 'tiles' | 'list'

export interface Entity {
  id: string
  icon?: string
  title: string
  description: string
  layout?: Layout
  connections?: string[] // IDs of entities this one connects to (same level)
  children?: Entity[]
}
