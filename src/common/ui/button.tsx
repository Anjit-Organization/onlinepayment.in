import Link from 'next/link'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'accent' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  accent: 'bg-accent text-accent-fg hover:opacity-90',
  // border-control, not border-default: the border is the only boundary signal
  // on a ghost button, so it must meet WCAG 1.4.11. UI.md §9.
  ghost: 'bg-transparent text-fg border border-border-control hover:bg-surface-sunk',
}

/** All sizes clear the 44px touch target floor. */
const SIZE: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-body-sm',
  md: 'min-h-11 px-4 text-body',
  lg: 'min-h-12 px-5 text-body',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium no-underline ' +
  'transition-[background-color,opacity] duration-[--dur-fast] cursor-pointer ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
}: {
  variant?: Variant
  size?: Size
  href?: string
  children: ReactNode
  className?: string
}) {
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`.trim()
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls}>
      {children}
    </button>
  )
}
