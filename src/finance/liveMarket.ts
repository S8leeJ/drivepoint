import { useSyncExternalStore } from 'react'
import type { LoanInputs } from './loan.ts'
import type { MarketSnapshot, ShopperId } from './market.ts'
import type { VehicleId } from './vehicles.ts'

export type MarketStatus = 'idle' | 'loading' | 'ready' | 'off' | 'error'

export type MarketQuery = {
  zip: string
  customerId: ShopperId
  body: VehicleId
  offer: LoanInputs
  budget: number
}

type MarketState = {
  zip: string
  armed: boolean
  status: MarketStatus
  snapshot: MarketSnapshot | null
}

const listeners = new Set<() => void>()
const cache = new Map<string, MarketSnapshot>()
const inflight = new Set<string>()

let delivery: ((snapshot: MarketSnapshot | null) => void) | null = null
let requestId = 0

let state: MarketState = {
  zip: '78701',
  armed: false,
  status: 'idle',
  snapshot: null,
}

let snapshot: MarketState = state

function emit() {
  snapshot = { ...state, snapshot: state.snapshot }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMarket() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function getMarketSnapshot() {
  return state.snapshot
}

export function getMarketZip() {
  return state.zip
}

export function marketArmed() {
  return state.armed
}

export function bindMarketDelivery(fn: (snapshot: MarketSnapshot | null) => void) {
  delivery = fn
}

export function armMarket(zip: string) {
  const digits = zip.replace(/\D/g, '').slice(0, 5)
  state = { ...state, armed: true, zip: digits }
  emit()
}

function cacheKey(query: MarketQuery) {
  const offer = query.offer
  return [
    query.customerId,
    query.zip,
    query.body,
    Math.round(offer.price),
    Math.round(offer.downPayment),
    offer.annualRate.toFixed(2),
    Math.round(offer.termMonths),
    offer.taxRate.toFixed(2),
    Math.round(offer.fees),
    Math.round(query.budget),
  ].join('|')
}

export function requestMarket(query: MarketQuery) {
  if (!/^\d{5}$/.test(query.zip)) {
    requestId += 1
    state = { ...state, zip: query.zip, status: 'error', snapshot: null }
    emit()
    delivery?.(null)
    return
  }
  const key = cacheKey(query)
  const cached = cache.get(key)
  if (cached) {
    requestId += 1
    state = { zip: query.zip, armed: true, status: 'ready', snapshot: cached }
    emit()
    delivery?.(cached)
    return
  }
  if (inflight.has(key)) return
  const id = requestId + 1
  requestId = id
  inflight.add(key)
  state = { ...state, zip: query.zip, status: 'loading', snapshot: null }
  emit()
  delivery?.(null)
  const params = new URLSearchParams({
    zip: query.zip,
    customer: query.customerId,
    body: query.body,
    price: String(query.offer.price),
    down: String(query.offer.downPayment),
    rate: String(query.offer.annualRate),
    term: String(query.offer.termMonths),
    tax: String(query.offer.taxRate),
    fees: String(query.offer.fees),
    budget: String(query.budget),
  })
  void fetch(`/api/market?${params}`)
    .then(async (response) => {
      const body: unknown = await response.json()
      return body
    })
    .then((body) => {
      inflight.delete(key)
      if (id !== requestId) return
      const record = body && typeof body === 'object' ? body as { ok?: unknown; reason?: unknown; snapshot?: MarketSnapshot } : {}
      if (record.ok === true && record.snapshot) {
        cache.set(key, record.snapshot)
        state = { zip: query.zip, armed: true, status: 'ready', snapshot: record.snapshot }
        emit()
        delivery?.(record.snapshot)
        return
      }
      state = { ...state, status: record.reason === 'off' ? 'off' : 'error', snapshot: null }
      emit()
      delivery?.(null)
    })
    .catch(() => {
      inflight.delete(key)
      if (id !== requestId) return
      state = { ...state, status: 'error', snapshot: null }
      emit()
      delivery?.(null)
    })
}
