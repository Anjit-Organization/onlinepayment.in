'use client'
// Client component: the mobile nav needs a real toggle with aria-expanded.

import { useState, type ReactNode } from 'react'

/**
 * Collapsible nav for small screens, always-open row at md+.
 *
 * NOT a <details>. A closed <details> collapses its content box to zero through
 * `content-visibility`, and `display: contents` on the element does not defeat
 * that — so at desktop the links existed, reported a sensible width of their
 * own, and still rendered off-screen at x=1400 on a 1440px viewport.
 *
 * Visibility is driven purely by Tailwind utilities rather than custom CSS,
 * because utilities and component rules sit in different cascade layers and the
 * component rule loses. The links are children, so they are in the
 * server-rendered HTML either way and stay crawlable.
 */
export function NavDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="main-nav"
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-border-control px-3 text-body-sm md:hidden"
      >
        Menu
      </button>

      <div
        id="main-nav"
        className={`${
          open ? 'block' : 'hidden'
        } absolute inset-x-0 top-full z-20 border-y border-border-default bg-surface px-4 py-3 md:static md:z-auto md:flex md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0`}
      >
        {children}
      </div>
    </>
  )
}
