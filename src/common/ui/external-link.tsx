import type { ReactNode } from 'react'

/**
 * Source citations are real outbound links and are deliberately NOT nofollowed —
 * genuine citation helps. data-source marks them for analytics. UI.md §6.1.
 */
export function ExternalLink({
  href,
  children,
  isSource = false,
}: {
  href: string
  children: ReactNode
  isSource?: boolean
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={isSource ? 'noopener' : 'noopener nofollow'}
      data-source={isSource || undefined}
      className="inline-flex items-baseline gap-1"
    >
      {children}
      <svg
        aria-hidden="true"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="shrink-0 translate-y-px"
      >
        <path d="M7 17 17 7M17 7H9m8 0v8" />
      </svg>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
