'use client'

import { METHOD_LABEL, type FeeMethod } from '@/modules/pricing/client'
import type { MethodMix } from '../domain/calculator'

const MIX_METHODS: FeeMethod[] = [
  'upi',
  'credit_card_domestic',
  'debit_card',
  'netbanking',
  'wallet',
]

/** Log scale: most of the useful range sits below ₹10 lakh. */
const VOL_MIN = 10_000
const VOL_MAX = 50_000_000
const toSlider = (v: number) =>
  Math.round(((Math.log(v) - Math.log(VOL_MIN)) / (Math.log(VOL_MAX) - Math.log(VOL_MIN))) * 1000)
const fromSlider = (p: number) =>
  Math.round(Math.exp(Math.log(VOL_MIN) + (p / 1000) * (Math.log(VOL_MAX) - Math.log(VOL_MIN))))

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function CalculatorInputs({
  volume,
  avgTxn,
  mix,
  normalised,
  onVolume,
  onAvgTxn,
  onMix,
  onReset,
}: {
  volume: number
  avgTxn: number
  mix: MethodMix
  normalised: MethodMix
  onVolume: (v: number) => void
  onAvgTxn: (v: number) => void
  onMix: (m: FeeMethod, v: number) => void
  onReset: () => void
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3">Your numbers</h2>
        <button
          type="button"
          onClick={onReset}
          className="min-h-11 cursor-pointer text-body-sm text-accent"
        >
          Reset
        </button>
      </div>

      <div className="mt-4">
        <label htmlFor="vol" className="block text-body-sm font-medium">
          Monthly volume
        </label>
        <output htmlFor="vol" className="mt-1 block font-mono text-data-lg">
          ₹{inr.format(volume)}
        </output>
        <input
          id="vol"
          type="range"
          min={0}
          max={1000}
          value={toSlider(volume)}
          onChange={(e) => onVolume(fromSlider(Number(e.target.value)))}
          className="mt-1 h-11 w-full cursor-pointer accent-[var(--c-accent)]"
          aria-describedby="vol-help"
        />
        <p id="vol-help" className="text-caption text-fg-subtle">
          ₹10,000 to ₹5 crore a month
        </p>
      </div>

      <div className="mt-5">
        <label htmlFor="txn" className="block text-body-sm font-medium">
          Average transaction
        </label>
        <output htmlFor="txn" className="mt-1 block font-mono text-data">
          ₹{inr.format(avgTxn)}
        </output>
        <input
          id="txn"
          type="range"
          min={100}
          max={50_000}
          step={100}
          value={avgTxn}
          onChange={(e) => onAvgTxn(Number(e.target.value))}
          className="mt-1 h-11 w-full cursor-pointer accent-[var(--c-accent)]"
          aria-describedby="txn-help"
        />
        <p id="txn-help" className="text-caption text-fg-subtle">
          Decides per-transaction flat fees, and which tier a banded rate falls in
        </p>
      </div>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-body-sm font-medium">Payment mix</legend>
        <p className="text-caption text-fg-subtle">
          Drag freely. These are scaled to 100% for you, so you never have to make them add up.
        </p>

        <div className="mt-2">
          {MIX_METHODS.map((m) => (
            <div key={m}>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`mix-${m}`} className="text-body-sm">
                  {METHOD_LABEL[m]}
                </label>
                <span className="font-mono text-caption text-fg-muted">
                  {Math.round(normalised[m] ?? 0)}%
                </span>
              </div>
              <input
                id={`mix-${m}`}
                type="range"
                min={0}
                max={100}
                value={mix[m] ?? 0}
                onChange={(e) => onMix(m, Number(e.target.value))}
                className="h-11 w-full cursor-pointer accent-[var(--c-accent)]"
              />
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
