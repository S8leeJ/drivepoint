import { buildLoan, formatMoney, type LoanInputs } from './loan.ts'
import type { VehicleId } from './vehicles.ts'

export const MILEAGE_WINDOW = 8000

export type ShopperId = 'maya' | 'jordan'

export type Listing = {
  title: string
  price: number
  mileage: number | null
  source: string
  link: string
  vehicleId: VehicleId | null
  monthlyCents: number
}

export type Place = {
  name: string
  rating: number | null
  hours: string | null
  address: string
  phone: string | null
  lat: number | null
  lng: number | null
  mapsUrl: string
}

export type MarketSample = 'accepted' | 'rejected' | 'empty'

export type MarketSnapshot = {
  zip: string
  listings: Listing[]
  comps: Listing[]
  marketValue: number | null
  sample: MarketSample
  fetchedAt: number
  dealer: Place | null
  serviceShop: Place | null
}

export type PricedRow = {
  title: string
  price: number
  mileage: number | null
  source: string
  link: string
}

export function ownCarQuery(id: ShopperId) {
  return id === 'maya' ? '2023 Toyota RAV4 Hybrid XLE' : '2021 Toyota Camry SE'
}

export function forSaleQuery(id: ShopperId) {
  return id === 'maya' ? '2023 Toyota RAV4 for sale' : '2021 Toyota Camry for sale'
}

export function inventoryQuery(body: VehicleId) {
  if (body === 'hatch') return 'Toyota Corolla hatchback for sale'
  if (body === 'sedan') return 'Toyota Camry for sale'
  return 'Toyota RAV4 for sale'
}

export function sameCar(title: string, id: ShopperId) {
  return id === 'maya' ? /\brav4\b/i.test(title) : /\bcamry\b/i.test(title)
}

export function vehicleIdFromTitle(title: string): VehicleId | null {
  const text = title.toLowerCase()
  if (/\brav4\b|\bhighlander\b|\b4runner\b|\b4-runner\b/.test(text)) return 'suv'
  if (/\bcorolla\b/.test(text) && /\bhatch/.test(text)) return 'hatch'
  if (/\bcamry\b/.test(text)) return 'sedan'
  if (/\bcorolla\b/.test(text) && /\bsedan\b/.test(text)) return 'sedan'
  return null
}

export function parseMileage(title: string, extensions: string[] = []) {
  const pattern = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k)?\s*(?:miles|mi)\b/i
  for (const text of [title, ...extensions]) {
    const match = text.match(pattern)
    if (!match) continue
    const raw = Number(match[1].replace(/,/g, ''))
    if (!Number.isFinite(raw)) continue
    const miles = match[2] ? raw * 1000 : raw
    if (miles < 100 || miles > 400000) continue
    return Math.round(miles)
  }
  return null
}

export function priceCeiling(offer: LoanInputs, budget: number) {
  const budgetCents = Math.round(Math.max(0, budget) * 100)
  let price = Math.max(0, offer.price)
  const payment = (amount: number) => buildLoan({ ...offer, price: amount }).monthlyCents
  if (payment(price) > budgetCents) return Math.round(price)
  for (let step = 0; step < 80; step += 1) {
    const next = price + 500
    if (next > 150000) return 150000
    if (payment(next) > budgetCents) return Math.round(next)
    price = next
  }
  return Math.round(price)
}

function mileGap(mileage: number | null, odometer: number) {
  if (mileage == null) return Number.POSITIVE_INFINITY
  return Math.abs(mileage - odometer)
}

function byBudget(a: Listing, b: Listing, budgetCents: number, odometer: number) {
  const aFit = a.monthlyCents <= budgetCents ? 0 : 1
  const bFit = b.monthlyCents <= budgetCents ? 0 : 1
  if (aFit !== bFit) return aFit - bFit
  if (a.monthlyCents !== b.monthlyCents) return a.monthlyCents - b.monthlyCents
  return mileGap(a.mileage, odometer) - mileGap(b.mileage, odometer)
}

export function rankListings(rows: PricedRow[], offer: LoanInputs, budget: number, odometer: number) {
  const budgetCents = Math.round(budget * 100)
  const seen = new Set<string>()
  const listings: Listing[] = []
  for (const row of rows) {
    if (!row.title.trim() || !Number.isFinite(row.price) || row.price <= 0) continue
    const key = row.link || `${row.title}|${row.price}`
    if (seen.has(key)) continue
    seen.add(key)
    listings.push({
      title: row.title.trim(),
      price: row.price,
      mileage: row.mileage,
      source: row.source.trim() || 'Dealer',
      link: row.link,
      vehicleId: vehicleIdFromTitle(row.title),
      monthlyCents: buildLoan({ ...offer, price: row.price }).monthlyCents,
    })
  }
  listings.sort((a, b) => byBudget(a, b, budgetCents, odometer))
  return listings
}

export function presentListings(listings: Listing[], offer: LoanInputs, budget: number, odometer: number) {
  const budgetCents = Math.round(budget * 100)
  const cards = listings.map((item) => ({
    ...item,
    monthlyCents: buildLoan({ ...offer, price: item.price }).monthlyCents,
  }))
  cards.sort((a, b) => byBudget(a, b, budgetCents, odometer))
  return cards
}

export function topInBudget(listings: Listing[], offer: LoanInputs, budget: number, odometer: number) {
  const [first] = presentListings(listings, offer, budget, odometer)
  if (!first || first.monthlyCents > Math.round(budget * 100)) return null
  return first
}

export function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export function judgeMedian(prices: number[], anchor: number): { marketValue: number | null; sample: MarketSample } {
  if (prices.length === 0 || !Number.isFinite(anchor) || anchor <= 0) return { marketValue: null, sample: 'empty' }
  const value = median(prices)
  if (value == null) return { marketValue: null, sample: 'empty' }
  if (value < anchor * 0.4 || value > anchor * 1.6) return { marketValue: null, sample: 'rejected' }
  return { marketValue: value, sample: 'accepted' }
}

export function compsFor(listings: Listing[], id: ShopperId, odometer: number) {
  return listings.filter((item) => (
    sameCar(item.title, id)
    && item.mileage != null
    && Math.abs(item.mileage - odometer) <= MILEAGE_WINDOW
  ))
}

export function assembleSnapshot(input: {
  zip: string
  customerId: ShopperId
  odometer: number
  anchor: number
  offer: LoanInputs
  budget: number
  rows: PricedRow[]
  dealer: Place | null
  serviceShop: Place | null
  fetchedAt: number
}): MarketSnapshot {
  const listings = rankListings(input.rows, input.offer, input.budget, input.odometer)
  const comps = compsFor(listings, input.customerId, input.odometer)
  const judged = judgeMedian(comps.map((item) => item.price), input.anchor)
  return {
    zip: input.zip,
    listings,
    comps,
    marketValue: judged.marketValue,
    sample: judged.sample,
    fetchedAt: input.fetchedAt,
    dealer: input.dealer,
    serviceShop: input.serviceShop,
  }
}

export function formatClock(at: number) {
  const date = new Date(at)
  let hours = date.getHours()
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const suffix = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${hours}:${minutes}${suffix}`
}

export function marketNote(snapshot: Pick<MarketSnapshot, 'marketValue' | 'comps' | 'sample' | 'fetchedAt'>) {
  if (snapshot.sample === 'accepted' && snapshot.marketValue != null) {
    const value = formatMoney(Math.round(snapshot.marketValue * 100))
    return `Market value ${value}, median of ${snapshot.comps.length} listings within 8,000 miles, cars for sale, ${formatClock(snapshot.fetchedAt)}.`
  }
  if (snapshot.sample === 'rejected') return 'The listing sample was rejected, so the contract value stays in place.'
  return null
}

export function confirmQuestion(source: string) {
  const seller = source.trim() || 'the seller'
  return `Confirm with ${seller} whether the advertised price includes fees.`
}

export function hoursLine(raw: string | null | undefined) {
  if (!raw) return null
  const text = raw.replace(/[·⋅]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/closed/i.test(text) && !/closes/i.test(text)) return 'closed'
  const closes = text.match(/closes?\s+(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?/i)
  const range = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)?/i)
  const clock = closes
    ? { hour: closes[1], minutes: closes[2] }
    : range
      ? { hour: range[3], minutes: range[4] }
      : null
  if (clock) {
    const hour = String(Number(clock.hour))
    const minutes = clock.minutes && clock.minutes !== '00' ? `:${clock.minutes}` : ''
    return `open until ${hour}${minutes}`
  }
  if (/^open$/i.test(text)) return 'open'
  return text.length > 48 ? `${text.slice(0, 45)}...` : text
}

export function deskLabel(fallback: string, place: Place | null) {
  if (!place) return fallback
  const rating = place.rating != null ? ` · ${place.rating.toFixed(1)}` : ''
  const hours = place.hours ? ` · ${place.hours}` : ''
  return `${place.name}${rating}${hours}`
}

export function captionFor(
  id: 'home' | 'dealer' | 'service',
  fallback: string,
  snapshot: Pick<MarketSnapshot, 'dealer' | 'serviceShop'> | null,
) {
  if (!snapshot) return fallback
  if (id === 'dealer') return deskLabel(fallback, snapshot.dealer)
  if (id === 'service') return deskLabel(fallback, snapshot.serviceShop)
  return fallback
}

export function plausibleVehicle(row: PricedRow) {
  if (row.price < 1500) return false
  return !/\b(diecast|matchbox|hot wheels|lego|collectible|scale model|toy|rc car)\b|1:\d+/i.test(row.title)
}

export function readShopping(hits: unknown): PricedRow[] {
  if (!Array.isArray(hits)) return []
  const rows: PricedRow[] = []
  for (const hit of hits) {
    if (!hit || typeof hit !== 'object') continue
    const row = hit as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const price = typeof row.extracted_price === 'number'
      ? row.extracted_price
      : typeof row.extracted_price === 'string' && row.extracted_price.trim()
        ? Number(row.extracted_price)
        : Number.NaN
    if (!title || !Number.isFinite(price) || price <= 0) continue
    const extensions = Array.isArray(row.extensions)
      ? row.extensions.filter((item): item is string => typeof item === 'string')
      : []
    const link = typeof row.link === 'string' && row.link
      ? row.link
      : typeof row.product_link === 'string'
        ? row.product_link
        : ''
    const source = typeof row.source === 'string' && row.source.trim() ? row.source.trim() : 'Dealer'
    rows.push({
      title,
      price,
      mileage: parseMileage(title, extensions),
      source,
      link,
    })
  }
  return rows
}

function dollars(value: unknown, raw?: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  const text = typeof value === 'string' ? value : typeof raw === 'string' ? raw : ''
  const parsed = Number(text.replace(/[$,]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN
}

export function readVehicles(payload: unknown): PricedRow[] {
  if (!payload || typeof payload !== 'object') return []
  const ads = (payload as { ads?: unknown }).ads
  if (!Array.isArray(ads)) return []
  const rows: PricedRow[] = []
  for (const ad of ads) {
    if (!ad || typeof ad !== 'object') continue
    const vehicles = (ad as { vehicles_for_sale?: unknown }).vehicles_for_sale
    if (!Array.isArray(vehicles)) continue
    for (const hit of vehicles) {
      if (!hit || typeof hit !== 'object') continue
      const row = hit as Record<string, unknown>
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      const price = dollars(row.extracted_price, row.price)
      if (!title || !Number.isFinite(price)) continue
      const mileageText = typeof row.mileage === 'string' ? row.mileage : ''
      const mileage = typeof row.extracted_mileage === 'number' && row.extracted_mileage >= 100
        ? row.extracted_mileage
        : parseMileage(title, mileageText ? [mileageText] : [])
      const dealer = typeof row.dealership === 'string' ? row.dealership.trim() : ''
      const link = typeof row.link === 'string' ? row.link : ''
      rows.push({
        title,
        price,
        mileage,
        source: dealer || 'Dealer',
        link,
      })
    }
  }
  return rows
}

export function readEbay(payload: unknown): PricedRow[] {
  if (!payload || typeof payload !== 'object') return []
  const results = (payload as { organic_results?: unknown }).organic_results
  if (!Array.isArray(results)) return []
  const rows: PricedRow[] = []
  for (const hit of results) {
    if (!hit || typeof hit !== 'object') continue
    const row = hit as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const priceRecord = row.price
    const price = priceRecord && typeof priceRecord === 'object'
      ? dollars(
        (priceRecord as { extracted?: unknown; from?: { extracted?: unknown } }).extracted
          ?? (priceRecord as { from?: { extracted?: unknown } }).from?.extracted,
        (priceRecord as { raw?: unknown }).raw,
      )
      : Number.NaN
    if (!title || !Number.isFinite(price)) continue
    const subtitle = typeof row.subtitle === 'string' ? row.subtitle : ''
    const seller = row.seller && typeof row.seller === 'object'
      ? (row.seller as { username?: unknown }).username
      : null
    const link = typeof row.link === 'string' ? row.link : ''
    rows.push({
      title,
      price,
      mileage: parseMileage(title, subtitle ? [subtitle] : []),
      source: typeof seller === 'string' && seller.trim() ? seller.trim() : 'eBay',
      link,
    })
  }
  return rows
}

function hoursFrom(value: unknown) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
  if (typeof record[today] === 'string') return record[today]
  for (const item of Object.values(record)) {
    if (typeof item === 'string') return item
  }
  return null
}

export function readPlace(hit: unknown): Place | null {
  if (!hit || typeof hit !== 'object') return null
  const row = hit as Record<string, unknown>
  const name = typeof row.title === 'string' ? row.title.trim() : ''
  if (!name) return null
  const gps = row.gps_coordinates
  const lat = gps && typeof gps === 'object' && typeof (gps as { latitude?: unknown }).latitude === 'number'
    ? (gps as { latitude: number }).latitude
    : null
  const lng = gps && typeof gps === 'object' && typeof (gps as { longitude?: unknown }).longitude === 'number'
    ? (gps as { longitude: number }).longitude
    : null
  const mapsUrl = lat != null && lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
  const openState = typeof row.open_state === 'string' ? row.open_state : ''
  const hoursText = typeof row.hours === 'string' ? row.hours : hoursFrom(row.operating_hours)
  const combined = [openState, hoursText].filter(Boolean).join(' ')
  const rating = typeof row.rating === 'number' ? row.rating : null
  return {
    name,
    rating,
    hours: hoursLine(combined),
    address: typeof row.address === 'string' ? row.address : '',
    phone: typeof row.phone === 'string' ? row.phone : null,
    lat,
    lng,
    mapsUrl,
  }
}
