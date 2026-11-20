import type { ReactNode } from 'react'

/**
 * Content type determines width, independently of the page container. UI.md §4.2.
 * Past 1536px nothing scales — the gutters absorb the extra space.
 */
export type LaneSize = 'prose' | 'default' | 'wide' | 'full'

const CLASS: Record<LaneSize, string> = {
  prose: 'lane-prose',
  default: 'lane-default',
  wide: 'lane-wide',
  full: '',
}

export function Lane({
  size = 'default',
  as: Tag = 'div',
  className = '',
  children,
}: {
  size?: LaneSize
  as?: 'div' | 'section' | 'header' | 'footer' | 'main' | 'nav'
  className?: string
  children: ReactNode
}) {
  return <Tag className={`${CLASS[size]} ${className}`.trim()}>{children}</Tag>
}
