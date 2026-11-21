'use client'

import { useMemo, useState } from 'react'
import { rupees } from '@/common/money'
import type { FeeMethod, GatewaySeed } from '@/modules/pricing/client'
import { DEFAULT_MIX, normaliseMix, rankGateways, type MethodMix } from '../domain/calculator'
import { CalculatorInputs } from './calculator-inputs'
import { CalculatorResults } from './results'

/**
 * Interactive, but server-rendered first.
 *
 * Initial state is exactly the defaults, so Next renders a complete result
 * table into the HTML before any JavaScript runs. A crawler sees real numbers;
 * hydration then makes them live. TECHNICAL §5.1 — a calculator whose output
 * only exists after hydration is invisible to search, which is the single most
 * common reason tool pages get no traffic.
 *
 * Gateway seeds cross the boundary as plain JSON (paise and basis points are
 * integers in the seed format, not bigint), and the engine rebuilds the branded
 * types on this side. The engine is pure, so it runs identically in both places.
 */
const DEFAULT_VOLUME = 500_000
const DEFAULT_AVG_TXN = 1_500

export function InteractiveCalculator({ gateways }: { gateways: GatewaySeed[] }) {
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [avgTxn, setAvgTxn] = useState(DEFAULT_AVG_TXN)
  const [mix, setMix] = useState<MethodMix>(DEFAULT_MIX)

  const normalised = useMemo(() => normaliseMix(mix), [mix])

  const input = useMemo(
    () => ({
      monthlyVolumePaise: rupees(volume),
      avgTransactionPaise: rupees(avgTxn),
      mix,
      includeSetupFee: false,
    }),
    [volume, avgTxn, mix],
  )

  const { ranked, incomparable } = useMemo(
    () => rankGateways(gateways, input),
    [gateways, input],
  )

  const reset = () => {
    setVolume(DEFAULT_VOLUME)
    setAvgTxn(DEFAULT_AVG_TXN)
    setMix(DEFAULT_MIX)
  }

  const setMethod = (m: FeeMethod, v: number) => setMix((prev) => ({ ...prev, [m]: v }))

  return (
    // Two panes from xl, where there is room for inputs beside results and the
    // ranking visibly reorders as you drag. UI.md §4.3.
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr] xl:items-start">
      <div className="xl:sticky xl:top-4">
        <CalculatorInputs
          volume={volume}
          avgTxn={avgTxn}
          mix={mix}
          normalised={normalised}
          onVolume={setVolume}
          onAvgTxn={setAvgTxn}
          onMix={setMethod}
          onReset={reset}
        />
      </div>

      {/* polite, so a screen reader hears the new ranking without being interrupted mid-drag */}
      <div aria-live="polite" aria-atomic="false">
        <CalculatorResults
          ranked={ranked}
          incomparable={incomparable}
          input={input}
          heading="Total first-year cost"
        />
      </div>
    </div>
  )
}
