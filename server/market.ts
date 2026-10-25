import type { IncomingMessage, ServerResponse } from 'node:http'
import { customerById, type Customer } from '../src/finance/customers.ts'
import type { LoanInputs } from '../src/finance/loan.ts'
import {
  assembleSnapshot,
  forSaleQuery,
  inventoryQuery,
  plausibleVehicle,
  readEbay,
  readPlace,
  readVehicles,
  vehicleIdFromTitle,
  type MarketSnapshot,
  type PricedRow,
  type ShopperId,
} from '../src/finance/market.ts'
import type { VehicleId } from '../src/finance/vehicles.ts'

const cache = new Map<string, MarketSnapshot>()
const inflight = new Map<string, Promise<MarketSnapshot>>()

function send(res: ServerResponse, body: unknown) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function queryOf(req: IncomingMessage) {
  return new URL(req.url ?? '/', 'http://drivepoint.local').searchParams
}

function numberFrom(params: URLSearchParams, key: string) {
  const value = Number(params.get(key))
  return Number.isFinite(value) ? value : Number.NaN
}

function shopperId(value: string | null): ShopperId | null {
  if (value === 'maya' || value === 'jordan') return value
  return null
}

function bodyId(value: string | null): VehicleId | null {
  if (value === 'hatch' || value === 'sedan' || value === 'suv') return value
  return null
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'request failed'
  if (/api_key|key=/i.test(message)) return 'SerpAPI request failed'
  return message.slice(0, 180)
}

async function serp(params: Record<string, string>, key: string) {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('api_key', key)
  url.searchParams.set('hl', 'en')
  url.searchParams.set('gl', 'us')
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`SerpAPI ${response.status}`)
  const payload: unknown = await response.json()
  if (payload && typeof payload === 'object' && 'error' in payload && (payload as { error?: unknown }).error) {
    const reason = (payload as { error?: unknown }).error
    const message = typeof reason === 'string' ? reason : 'SerpAPI returned an error'
    if (!/hasn't returned any results|no results/i.test(message)) throw new Error(message)
  }
  return payload
}

async function locationFor(zip: string, key: string) {
  const url = new URL('https://serpapi.com/locations.json')
  url.searchParams.set('q', zip)
  url.searchParams.set('limit', '1')
  url.searchParams.set('api_key', key)
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) return zip
  const payload: unknown = await response.json()
  const first = Array.isArray(payload) ? payload[0] : null
  if (first && typeof first === 'object' && typeof (first as { canonical_name?: unknown }).canonical_name === 'string') {
    return (first as { canonical_name: string }).canonical_name
  }
  return zip
}

function carRows(rows: PricedRow[]) {
  return rows.filter((row) => row.price <= 150000 && plausibleVehicle(row) && vehicleIdFromTitle(row.title) != null)
}

function firstPlace(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const results = (payload as { local_results?: unknown }).local_results
  if (!Array.isArray(results)) return null
  for (const hit of results) {
    const place = readPlace(hit)
    if (place) return place
  }
  return null
}

async function loadSnapshot(input: {
  zip: string
  customer: Customer
  body: VehicleId
  offer: LoanInputs
  budget: number
  key: string
}) {
  const location = await locationFor(input.zip, input.key)
  const [own, inventory, dealer, service] = await Promise.all([
    serp({
      engine: 'google_ads',
      q: forSaleQuery(input.customer.id),
      location,
    }, input.key),
    serp({
      engine: 'google_ads',
      q: inventoryQuery(input.body),
      location,
    }, input.key),
    serp({
      engine: 'google_maps',
      type: 'search',
      q: 'Toyota dealer',
      location,
      z: '13',
    }, input.key),
    serp({
      engine: 'google_maps',
      type: 'search',
      q: 'Toyota service',
      location,
      z: '13',
    }, input.key),
  ])
  let rows = carRows([...readVehicles(own), ...readVehicles(inventory)])
  if (rows.length === 0) {
    try {
      const ebay = await serp({
        engine: 'ebay',
        _nkw: forSaleQuery(input.customer.id).replace(/ for sale$/, ''),
        _udlo: '4000',
        _stpos: input.zip,
        category_id: '6001',
      }, input.key)
      rows = carRows(readEbay(ebay))
    } catch (error) {
      console.error(`Market listing fallback failed: ${safeMessage(error)}`)
    }
  }
  return assembleSnapshot({
    zip: input.zip,
    customerId: input.customer.id,
    odometer: input.customer.miles,
    anchor: input.customer.marketValue,
    offer: input.offer,
    budget: input.budget,
    rows,
    dealer: firstPlace(dealer),
    serviceShop: firstPlace(service),
    fetchedAt: Date.now(),
  })
}

export async function marketResponse(req: IncomingMessage, res: ServerResponse, key: string) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end()
    return
  }
  if (!key) {
    send(res, { ok: false, reason: 'off' })
    return
  }
  const params = queryOf(req)
  const zip = params.get('zip') ?? ''
  const customerId = shopperId(params.get('customer'))
  const body = bodyId(params.get('body'))
  const price = numberFrom(params, 'price')
  const downPayment = numberFrom(params, 'down')
  const annualRate = numberFrom(params, 'rate')
  const termMonths = numberFrom(params, 'term')
  const taxRate = numberFrom(params, 'tax')
  const fees = numberFrom(params, 'fees')
  const budget = numberFrom(params, 'budget')
  if (!/^\d{5}$/.test(zip) || !customerId || !body || [price, downPayment, annualRate, termMonths, taxRate, fees, budget].some((value) => !Number.isFinite(value))) {
    send(res, { ok: false, reason: 'error' })
    return
  }
  const offer: LoanInputs = {
    price,
    downPayment,
    annualRate,
    termMonths,
    taxRate,
    fees,
    rollExtras: false,
  }
  const cacheKey = [
    customerId,
    zip,
    body,
    Math.round(price),
    Math.round(downPayment),
    annualRate.toFixed(2),
    Math.round(termMonths),
    taxRate.toFixed(2),
    Math.round(fees),
    Math.round(budget),
  ].join('|')
  const cached = cache.get(cacheKey)
  if (cached) {
    send(res, { ok: true, snapshot: cached })
    return
  }
  let pending = inflight.get(cacheKey)
  if (!pending) {
    pending = loadSnapshot({ zip, customer: customerById(customerId), body, offer, budget, key })
      .then((snapshot) => {
        cache.set(cacheKey, snapshot)
        return snapshot
      })
      .finally(() => {
        inflight.delete(cacheKey)
      })
    inflight.set(cacheKey, pending)
  }
  try {
    const snapshot = await pending
    send(res, { ok: true, snapshot })
  } catch (error) {
    console.error(`Market lookup failed: ${safeMessage(error)}`)
    send(res, { ok: false, reason: 'error' })
  }
}
