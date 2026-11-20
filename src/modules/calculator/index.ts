export {
  DEFAULT_MIX,
  normaliseMix,
  computeGatewayCost,
  rankGateways,
  type CalcInput,
  type MethodMix,
  type GatewayCost,
  type RankedCost,
  type RankingResult,
  type MethodBreakdown,
} from './domain/calculator'
export { SCENARIOS, getScenario, type Scenario } from './domain/scenarios'
export { USE_CASES, getUseCase, type UseCase } from './domain/use-cases'
export { RankedResult } from './components/ranked-result'
export { CalculatorResults } from './components/results'
