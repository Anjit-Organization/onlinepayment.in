import { formatINR } from '@/common/money'
import type { GatewaySeed } from '@/modules/pricing'
import type { Crossover } from '../domain/crossover'

/**
 * A COMPUTED verdict, not a written one. UI.md §8.3.
 *
 * Nothing here could appear on any other comparison page — the sentence is
 * generated from this pair's own numbers. That is what separates these pages
 * from the template comparisons Google's 2026 spam updates targeted.
 */
export function Verdict({
  crossover,
  a,
  b,
}: {
  crossover: Crossover
  a: GatewaySeed
  b: GatewaySeed
}) {
  const nameOf = (slug: string) => (slug === a.slug ? a.displayName : b.displayName)

  return (
    <section
      aria-label="Verdict"
      className="rounded-lg border border-border-strong bg-surface p-4 md:p-5"
    >
      <h2 className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        On published rates
      </h2>

      {crossover.kind === 'tie' ? (
        <p className="mt-2 text-body md:text-h3 md:leading-snug">
          <strong>{a.displayName}</strong> and <strong>{b.displayName}</strong> publish identical
          pricing, so neither is cheaper at any volume. Choose on settlement time, features or
          support instead.
        </p>
      ) : crossover.kind === 'always' ? (
        <p className="mt-2 text-body md:text-h3 md:leading-snug">
          <strong>{nameOf(crossover.winner)}</strong> is cheaper than{' '}
          {nameOf(crossover.loser)} at every volume, on a typical payment mix.
        </p>
      ) : (
        <p className="mt-2 text-body md:text-h3 md:leading-snug">
          <strong>{nameOf(crossover.cheaperBelow)}</strong> is cheaper below{' '}
          <span className="font-mono">{formatINR(crossover.atPaise, { whole: true })}</span> a
          month. Above that, <strong>{nameOf(crossover.cheaperAbove)}</strong> is cheaper.
        </p>
      )}

      <p className="mt-3 text-caption text-fg-muted">
        Worked out from published rates, with annual fees and 18% GST included. It recalculates
        whenever the pricing behind it moves, so nobody is hand-writing these verdicts.
      </p>
    </section>
  )
}
