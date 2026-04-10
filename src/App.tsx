import { useState } from 'react'
import { TakeSix } from './TakeSix'
import { sampleData } from './sample-data'
import type { Entity } from './types'

export function App() {
  const [data, setData] = useState<Entity[]>(sampleData)
  return <TakeSix entities={data} onChange={setData} />
}
