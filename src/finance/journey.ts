import { useSyncExternalStore } from 'react'
import { customerById, type Customer } from './customers.ts'
import {
  baselineLease,
  baselineOffer,
  baselinePreferences,
  baselineTrade,
  contractLoanInputs,
  decide,
  emptyOwnership,
  monthlyEnergy,
  ratePercent,
  savingsDown,
  type DecisionInput,
  type LeaseTerms,
  type OfferKind,
  type OwnershipCosts,
  type PathId,
  type Preferences,
  type Priority,
  type TradeTerms,
} from './decide.ts'
import { equityAdjustment } from './plan.ts'
import { applyScenario, getLiveScenario, setComparePair, useScenario, type Scenario } from './scenario.ts'
import { vehicleById } from './vehicles.ts'

export type EnergyAssumptions = { mpg: number; gallonPrice: number }
export type SavingsPlan = { monthly: number; months: number; futurePrice: number; futureRate: number }

export type SavedBay = {
  id: string
  name: string
  scenario: Scenario
  offerKind: OfferKind
  preferences: Preferences
}

export type VisitStatus = 'idle' | 'prepared' | 'sent' | 'failed'
export type RequestKind = 'test-drive' | 'appraisal' | 'financing' | 'service'

export const CHECKLIST = [
  ['license', 'Driver license'],
  ['insurance', 'Proof of insurance'],
  ['income', 'Proof of income'],
  ['rate', 'Ask how the rate is quoted'],
  ['fees', 'Ask which fees are required'],
  ['compare', 'Compare two scenarios'],
  ['timeline', 'Read the ownership timeline'],
] as const

export type SessionEvent = {
  id: number
  at: number
  label: string
  detail: string
}

type JourneyState = {
  customerId: Customer['id'] | null
  offerKind: OfferKind
  contractKind: OfferKind | null
  contractOffer: DecisionInput['offer'] | null
  preferences: Preferences
  ownership: OwnershipCosts
  lease: LeaseTerms
  trade: TradeTerms
  energy: EnergyAssumptions
  savings: SavingsPlan
  noted: boolean
  showCosts: boolean
  highlight: 'interest' | null
  visitSummary: string
  visitQuestions: string
  visitStatus: VisitStatus
  requestKind: RequestKind | null
  checks: Record<string, boolean>
  garage: SavedBay[]
  events: SessionEvent[]
}

const listeners = new Set<() => void>()
const opening = customerById('maya')

let eventId = 1
let state: JourneyState = {
  customerId: 'maya',
  offerKind: 'buyout',
  contractKind: null,
  contractOffer: null,
  preferences: baselinePreferences(opening),
  ownership: emptyOwnership(),
  lease: baselineLease(opening),
  trade: baselineTrade(opening),
  energy: { mpg: 32, gallonPrice: 3.4 },
  savings: { monthly: 200, months: 18, futurePrice: 30000, futureRate: 6.5 },
  noted: false,
  showCosts: false,
  highlight: null,
  visitSummary: '',
  visitQuestions: '',
  visitStatus: 'idle',
  requestKind: null,
  checks: Object.fromEntries(CHECKLIST.map(([id]) => [id, false])),
  garage: [],
  events: [],
}

let snapshot: JourneyState = state

function emit() {
  snapshot = {
    ...state,
    preferences: { ...state.preferences },
    ownership: { ...state.ownership },
    lease: { ...state.lease },
    trade: { ...state.trade },
    energy: { ...state.energy },
    savings: { ...state.savings },
    contractOffer: state.contractOffer ? { ...state.contractOffer } : null,
    events: state.events.slice(),
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useJourney() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function getJourney() {
  return state
}

function remember(label: string, detail: string) {
  const last = state.events[0]
  if (last && last.label === label && last.detail === detail) return
  state = {
    ...state,
    events: [{ id: eventId, at: Date.now(), label, detail }, ...state.events].slice(0, 40),
  }
  eventId += 1
}

export function recordEvent(label: string, detail: string) {
  remember(label, detail)
  emit()
}

function liveVehicle() {
  const active = getLiveScenario().active
  return { vehicleId: active.vehicleId, colorId: active.colorId }
}

export function loadCustomer(id: Customer['id']) {
  if (state.customerId === id) return
  const customer = customerById(id)
  const offer = baselineOffer(customer)
  state = {
    ...state,
    customerId: id,
    offerKind: offer.kind,
    contractKind: null,
    contractOffer: null,
    preferences: baselinePreferences(customer),
    ownership: emptyOwnership(),
    lease: baselineLease(customer),
    trade: baselineTrade(customer),
    noted: false,
    visitSummary: '',
    visitQuestions: '',
    visitStatus: 'idle',
    requestKind: null,
  }
  remember('Chose a customer', customer.name)
  applyScenario(
    { ...liveVehicle(), inputs: offer.inputs },
    `${customer.name}'s starting ${offer.kind === 'buyout' ? 'buyout' : 'refinance'} offer is loaded. The car in the valley stays the one you are driving.`,
  )
  emit()
}

export function restoreOffer() {
  if (!state.customerId) return
  const customer = customerById(state.customerId)
  const offer = baselineOffer(customer)
  state = { ...state, offerKind: offer.kind, contractKind: null, contractOffer: null, noted: false }
  remember('Restored the starting offer', customer.name)
  applyScenario(
    { ...liveVehicle(), inputs: offer.inputs },
    `Restored ${customer.name}'s starting ${offer.kind === 'buyout' ? 'buyout' : 'refinance'} offer.`,
  )
  emit()
}

export function shopVehicle() {
  if (state.offerKind === 'replacement') return
  if (state.offerKind === 'buyout' || state.offerKind === 'refinance') {
    state = {
      ...state,
      contractKind: state.offerKind,
      contractOffer: { ...getLiveScenario().active.inputs },
      offerKind: 'replacement',
    }
  } else {
    state = { ...state, offerKind: 'replacement' }
  }
  remember('Shopping a vehicle', 'The open offer is now a different vehicle. The contract offer is kept for the comparison.')
  emit()
}

export function presentPath(id: PathId) {
  if (!state.customerId) return
  if (id !== 'buyout' && id !== 'refinance') return
  if (state.offerKind === id) return
  const customer = customerById(state.customerId)
  const inputs = state.contractKind === id && state.contractOffer
    ? state.contractOffer
    : id === 'buyout'
      ? baselineOffer(customer).inputs
      : {
          price: customer.balance,
          downPayment: 0,
          annualRate: ratePercent(customer.refiApr),
          termMonths: customer.refiTerm,
          taxRate: 0,
          fees: 0,
          rollExtras: false as const,
        }
  state = { ...state, offerKind: id }
  applyScenario({ ...liveVehicle(), inputs }, null)
  emit()
}

export function noteNextStep(title: string) {
  if (state.noted) return
  state = { ...state, noted: true }
  remember('Noted the next step', title)
  emit()
}

export function setPreferences(patch: Partial<Preferences>) {
  state = { ...state, preferences: { ...state.preferences, ...patch } }
  emit()
}

export function setPriority(priority: Priority) {
  setPreferences({ priority })
}

export function setOwnership(patch: Partial<OwnershipCosts>) {
  state = { ...state, ownership: { ...state.ownership, ...patch } }
  emit()
}

export function setLease(patch: Partial<LeaseTerms>) {
  state = { ...state, lease: { ...state.lease, ...patch } }
  emit()
}

export function setTrade(patch: Partial<TradeTerms>) {
  state = { ...state, trade: { ...state.trade, ...patch } }
  emit()
}

export function setEnergy(patch: Partial<EnergyAssumptions>) {
  state = { ...state, energy: { ...state.energy, ...patch } }
  emit()
}

export function setHighlight(highlight: 'interest' | null) {
  if (state.highlight === highlight) return
  state = { ...state, highlight }
  emit()
}

export function setShowCosts(showCosts: boolean) {
  if (state.showCosts === showCosts) return
  state = { ...state, showCosts }
  remember(showCosts ? 'Showed where the money goes' : 'Hid the cost breakdown', '')
  emit()
}

export function setSavings(patch: Partial<SavingsPlan>) {
  state = { ...state, savings: { ...state.savings, ...patch } }
  emit()
}

function writeOffer(patch: Partial<DecisionInput['offer']>, notice: string, label: string) {
  const active = getLiveScenario().active
  remember(label, notice)
  applyScenario({ ...active, inputs: { ...active.inputs, ...patch } }, notice)
  emit()
}

export function applyUpfrontCash() {
  writeOffer(
    { downPayment: state.preferences.upfrontCash },
    'Down payment now matches the cash on hand.',
    'Applied upfront cash',
  )
}

export function applyTradeEquity() {
  const equity = state.trade.value - state.trade.payoff
  const active = getLiveScenario().active.inputs
  const next = equityAdjustment(active.price, active.downPayment, equity)
  const notice = equity >= 0
    ? 'Positive equity was added to the down payment.'
    : 'Negative equity was added to the price so the shortfall is financed.'
  writeOffer({ price: next.price, downPayment: next.downPayment }, notice, 'Applied trade equity')
}

export function applyFuelEstimate() {
  const fuel = monthlyEnergy(state.preferences.annualMiles, state.energy.mpg, state.energy.gallonPrice)
  state = { ...state, ownership: { ...state.ownership, fuel } }
  remember('Updated the fuel estimate', `${fuel.toFixed(2)} a month`)
  emit()
}

export function applySavingsCash() {
  const extra = savingsDown(state.savings.monthly, state.savings.months)
  const down = getLiveScenario().active.inputs.downPayment + extra
  writeOffer(
    { downPayment: down },
    `Added ${extra.toFixed(0)} of hypothetical savings to the down payment. The future price and rate are still uncertain.`,
    'Applied savings',
  )
}

let bayId = 1

export function saveBay(name: string) {
  const active = getLiveScenario().active
  const bay: SavedBay = {
    id: `bay-${bayId}`,
    name: name.trim() || `Scenario ${bayId}`,
    scenario: { vehicleId: active.vehicleId, colorId: active.colorId, inputs: { ...active.inputs } },
    offerKind: state.offerKind,
    preferences: { ...state.preferences },
  }
  bayId += 1
  state = { ...state, garage: [bay, ...state.garage] }
  remember('Saved a scenario', bay.name)
  emit()
}

export function renameBay(id: string, name: string) {
  state = {
    ...state,
    garage: state.garage.map((bay) => (bay.id === id ? { ...bay, name } : bay)),
  }
  emit()
}

export function deleteBay(id: string) {
  const bay = state.garage.find((item) => item.id === id)
  state = { ...state, garage: state.garage.filter((item) => item.id !== id) }
  remember('Deleted a scenario', bay?.name ?? id)
  emit()
}

export function reopenBay(id: string) {
  const bay = state.garage.find((item) => item.id === id)
  if (!bay) return
  state = { ...state, offerKind: bay.offerKind, preferences: { ...bay.preferences } }
  remember('Reopened a scenario', bay.name)
  applyScenario(bay.scenario, `Reopened ${bay.name}. The saved copy stays in the garage.`)
  emit()
}

export function toggleCheck(id: string) {
  state = { ...state, checks: { ...state.checks, [id]: !state.checks[id] } }
  emit()
}

export function prepareVisit(summary: string, questions: string) {
  state = {
    ...state,
    visitSummary: summary,
    visitQuestions: questions,
    visitStatus: 'prepared',
  }
  remember('Prepared a visit', 'Summary is ready to edit')
  emit()
}

export function setVisitDraft(summary: string, questions: string) {
  state = { ...state, visitSummary: summary, visitQuestions: questions }
  emit()
}

export function submitRequest(kind: RequestKind, fail: boolean) {
  state = { ...state, requestKind: kind, visitStatus: fail ? 'failed' : 'sent' }
  remember(fail ? 'Request failed in the local demo' : 'Stored a request on this device', kind)
  emit()
}

export function decisionInput(journey: JourneyState, offer: DecisionInput['offer'], vehicleName: string): DecisionInput {
  return {
    customer: journey.customerId ? customerById(journey.customerId) : null,
    offerKind: journey.offerKind,
    offer,
    vehicleName,
    preferences: journey.preferences,
    ownership: journey.ownership,
    lease: journey.lease,
    trade: journey.trade,
    contractKind: journey.contractKind,
    contractOffer: journey.contractOffer,
  }
}

export function useDecision() {
  const scenario = useScenario()
  const journey = useJourney()
  return decide(decisionInput(journey, scenario.active.inputs, vehicleById(scenario.active.vehicleId).name))
}

export function stageCompare() {
  const live = getLiveScenario().active
  if (!state.customerId) {
    setComparePair(live, { ...live, inputs: { ...live.inputs } }, 'Both bays start from the open offer. Change one side to compare.')
    return
  }
  const customer = customerById(state.customerId)
  if (customer.contract === 'loan') {
    setComparePair(
      { ...live, inputs: contractLoanInputs(customer) },
      live,
      'Scenario A is the current loan. Scenario B is the offer you are editing.',
    )
    return
  }
  const buyout = state.offerKind === 'buyout'
    ? live.inputs
    : state.contractKind === 'buyout' && state.contractOffer
      ? state.contractOffer
      : baselineOffer(customer).inputs
  if (state.offerKind === 'replacement') {
    setComparePair(
      { ...live, inputs: buyout },
      live,
      'Scenario A is the buyout. Scenario B is the vehicle you are shopping.',
    )
    return
  }
  setComparePair(live, { ...live, inputs: { ...live.inputs } }, 'Both bays are the buyout. Change one side to compare.')
}
