import type { Entity } from './types'

export const sampleData: Entity[] = [
  {
    id: '1',
    icon: '⬡',
    title: 'Frontend',
    description: 'All client-side concerns',
    children: [
      {
        id: '1-1',
        icon: '⚛',
        title: 'React',
        description: 'UI component library',
        children: [
          { id: '1-1-1', icon: '□', title: 'Components', description: 'Reusable UI pieces' },
          { id: '1-1-2', icon: '◎', title: 'Hooks', description: 'Stateful logic primitives' },
          { id: '1-1-3', icon: '◈', title: 'Context', description: 'Global state sharing' },
          { id: '1-1-4', icon: '□', title: 'Components', description: 'Reusable UI pieces' },
          { id: '1-1-5', icon: '◎', title: 'Hooks', description: 'Stateful logic primitives' },
          { id: '1-1-6', icon: '◈', title: 'Context', description: 'Global state sharing' },
        ],
      },
      {
        id: '1-2',
        icon: '✦',
        title: 'Styling',
        description: 'Visual presentation layer',
        children: [
          { id: '1-2-1', title: 'CSS Modules', description: 'Scoped styles per component' },
          { id: '1-2-2', title: 'Tokens', description: 'Design system variables' },
        ],
      },
      { id: '1-3', icon: '⇢', title: 'Routing', description: 'Client-side navigation' },
    ],
  },
  {
    id: '2',
    icon: '◈',
    title: 'Backend',
    description: 'Server-side services and APIs',
    children: [
      { id: '2-1', icon: '⇌', title: 'REST API', description: 'HTTP endpoints' },
      { id: '2-2', icon: '⊛', title: 'Auth', description: 'Authentication & authorization' },
      { id: '2-3', icon: '⊞', title: 'Database', description: 'Persistent data storage' },
    ],
  },
  {
    id: '3',
    icon: '⊙',
    title: 'Infrastructure',
    description: 'Deployment and operations',
    children: [
      { id: '3-1', icon: '↻', title: 'CI/CD', description: 'Automated build and deploy' },
      { id: '3-2', icon: '◉', title: 'Monitoring', description: 'Metrics and alerting' },
    ],
  },
  {
    id: '4',
    icon: '✳',
    title: 'Design',
    description: 'UX research and visual design',
  },
  {
    id: '5',
    icon: '◇',
    title: 'Product',
    description: 'Roadmap and requirements',
  },
  {
    id: '6',
    icon: '⋯',
    title: 'Data',
    description: 'Analytics and ML pipelines',
    children: [
      { id: '6-1', icon: '↓', title: 'Ingestion', description: 'Event collection' },
      { id: '6-2', icon: '▦', title: 'Warehouse', description: 'Structured storage' },
      { id: '6-3', icon: '⊹', title: 'ML', description: 'Model training and serving' },
    ],
  },
]
