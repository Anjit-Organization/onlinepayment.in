'use client'
// Client component: reads and writes the viewer's theme preference.

import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as Theme | null
      if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored)
    } catch {
      // private mode / blocked storage: fall through to system
    }
  }, [])

  function apply(next: Theme) {
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      // ignore: the attribute below still applies for this page view
    }
    const root = document.documentElement
    if (next === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', next)
  }

  return (
    <fieldset className="flex items-center gap-0 rounded-md border border-border-control p-0.5">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-sm px-2 py-1 text-caption ${
            theme === o.value ? 'bg-primary text-primary-fg' : 'text-fg-muted'
          }`}
        >
          <input
            type="radio"
            name="theme"
            value={o.value}
            checked={theme === o.value}
            onChange={() => apply(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
