export type Layout = 'tiles' | 'list'

export interface Entity {
  id: string
  icon?: string
  title: string
  description: string
  layout?: Layout
  children?: Entity[]
}
