import { useSyncExternalStore } from 'react'
import { buildLoan, formatMoney, maxDownPayment, sanitizeInputs, type LoanInputs } from './loan.ts'
import { vehicleById, type PaintId, type VehicleId } from './vehicles.ts'

export type Scenario = {
  vehicleId: VehicleId
  colorId: PaintId
  inputs: LoanInputs
}

type ScenarioState = {
  active: Scenario
  notice: string | null
  compareA: Scenario | null
  compareB: Scenario | null
  timelineMonth: number
}

const listeners = new Set<() => void>()

const initialInputs: LoanInputs = {
  price: 32450,
  downPayment: 4000,
  annualRate: 5.9,
  termMonths: 60,
  taxRate: 6.25,
  fees: 499,
  rollExtras: false,
}

let state: ScenarioState = {
  active: { vehicleId: 'hatch', colorId: 'green', inputs: initialInputs },
  notice: null,
  compareA: null,
  compareB: null,
  timelineMonth: 0,
}

let snapshot: ScenarioState = state

function cloneScenario(scenario: Scenario): Scenario {
  return {
    vehicleId: scenario.vehicleId,
    colorId: scenario.colorId,
    inputs: { ...scenario.inputs },
  }
}

function emit() {
  snapshot = {
    active: cloneScenario(state.active),
    notice: state.notice,
    compareA: state.compareA ? cloneScenario(state.compareA) : null,
    compareB: state.compareB ? cloneScenario(state.compareB) : null,
    timelineMonth: state.timelineMonth,
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export function useScenario() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getLiveScenario() {
  return state
}

function clampMonth(term: number) {
  state.timelineMonth = Math.min(Math.max(0, state.timelineMonth), Math.max(0, term))
}

function dollars(cents: number) {
  return formatMoney(Math.round(cents))
}

export function setInputs(patch: Partial<LoanInputs>) {
  const inputs = sanitizeInputs({ ...state.active.inputs, ...patch })
  state = { ...state, active: { ...state.active, inputs } }
  clampMonth(inputs.termMonths)
  emit()
}

export function setColor(colorId: PaintId) {
  if (state.active.colorId === colorId) return
  state = { ...state, active: { ...state.active, colorId } }
  emit()
}

export function chooseVehicle(vehicleId: VehicleId) {
  if (state.active.vehicleId === vehicleId) return
  const vehicle = vehicleById(vehicleId)
  const previous = state.active.inputs
  const inputs = sanitizeInputs({ ...previous, price: vehicle.price })
  const capped = previous.downPayment > maxDownPayment({ ...previous, price: vehicle.price, rollExtras: previous.rollExtras })
  const down = capped
    ? ` Down payment was reduced from ${dollars(previous.downPayment * 100)} to ${dollars(inputs.downPayment * 100)} so it does not exceed this vehicle.`
    : ''
  state = {
    ...state,
    active: { ...state.active, vehicleId, inputs },
    notice: `${vehicle.name} is selected at its illustrative price of ${dollars(vehicle.price * 100)}. Interest rate, term, taxes, and fees stayed the same.${down}`,
  }
  clampMonth(inputs.termMonths)
  emit()
}

export function clearNotice() {
  if (!state.notice) return
  state = { ...state, notice: null }
  emit()
}

export function setTimelineMonth(month: number) {
  const term = state.active.inputs.termMonths
  const next = Math.min(Math.max(0, Math.round(month)), Math.max(0, term))
  if (next === state.timelineMonth) return
  state = { ...state, timelineMonth: next }
  emit()
}

function putCompare(slot: 'a' | 'b', scenario: Scenario, notice: string) {
  state = {
    ...state,
    compareA: slot === 'a' ? cloneScenario(scenario) : state.compareA,
    compareB: slot === 'b' ? cloneScenario(scenario) : state.compareB,
    notice,
  }
  emit()
}

export function addActiveToCompare() {
  const snap = cloneScenario(state.active)
  if (!state.compareA) {
    putCompare('a', snap, 'Added as scenario A.')
    return
  }
  if (!state.compareB) {
    putCompare('b', snap, 'Added as scenario B. Scenario A is unchanged.')
    return
  }
  putCompare('b', snap, 'Scenario B was replaced with this financing scenario. Scenario A is unchanged.')
}

export function replaceCompare(slot: 'a' | 'b') {
  const label = slot === 'a' ? 'A' : 'B'
  putCompare(slot, state.active, `Scenario ${label} now matches the current financing scenario.`)
}

export function updateCompare(slot: 'a' | 'b', patch: Partial<LoanInputs>) {
  const current = slot === 'a' ? state.compareA : state.compareB
  if (!current) return
  const inputs = sanitizeInputs({ ...current.inputs, ...patch })
  const next = { ...current, inputs }
  state = {
    ...state,
    compareA: slot === 'a' ? next : state.compareA,
    compareB: slot === 'b' ? next : state.compareB,
  }
  emit()
}

export function continueWith(slot: 'a' | 'b') {
  const current = slot === 'a' ? state.compareA : state.compareB
  if (!current) return false
  const label = slot === 'a' ? 'A' : 'B'
  const next = cloneScenario(current)
  state = {
    ...state,
    active: next,
    notice: `Continuing with scenario ${label}. The saved comparison stays as it was.`,
    timelineMonth: Math.min(state.timelineMonth, next.inputs.termMonths),
  }
  emit()
  return true
}

export function activeQuote() {
  return buildLoan(state.active.inputs)
}
