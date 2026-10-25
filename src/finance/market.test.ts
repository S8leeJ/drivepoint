import assert from 'node:assert/strict'
import { test } from 'node:test'
import { customerById } from './customers.ts'
import { baselineOffer } from './decide.ts'
import { buildLoan } from './loan.ts'
import {
  assembleSnapshot,
  confirmQuestion,
  deskLabel,
  hoursLine,
  inventoryQuery,
  judgeMedian,
  marketNote,
  ownCarQuery,
  parseMileage,
  plausibleVehicle,
  priceCeiling,
  rankListings,
  readShopping,
  sameCar,
  vehicleIdFromTitle,
  type PricedRow,
  type Place,
} from './market.ts'

const mayaOffer = baselineOffer(customerById('maya')).inputs

test('the price ceiling is the first price whose payment crosses the budget', () => {
  const ceiling = priceCeiling(mayaOffer, 520)
  assert.ok(buildLoan({ ...mayaOffer, price: ceiling }).monthlyCents > 52000)
  assert.ok(buildLoan({ ...mayaOffer, price: ceiling - 500 }).monthlyCents <= 52000)
})

test('mileage comes from the title or the extensions', () => {
  assert.equal(parseMileage('2023 Toyota RAV4 Hybrid XLE'), null)
  assert.equal(parseMileage('2023 Toyota RAV4 Hybrid XLE 34,200 miles'), 34200)
  assert.equal(parseMileage('2021 Toyota Camry SE', ['58k mi']), 58000)
  assert.equal(parseMileage('Used', ['Clean']), null)
})

test('a title maps onto the valley body, or onto nothing', () => {
  assert.equal(vehicleIdFromTitle('2024 Toyota RAV4 XLE'), 'suv')
  assert.equal(vehicleIdFromTitle('Toyota Highlander Limited'), 'suv')
  assert.equal(vehicleIdFromTitle('Toyota 4Runner TRD'), 'suv')
  assert.equal(vehicleIdFromTitle('2021 Toyota Camry SE'), 'sedan')
  assert.equal(vehicleIdFromTitle('Toyota Corolla sedan LE'), 'sedan')
  assert.equal(vehicleIdFromTitle('Toyota Corolla Hatchback'), 'hatch')
  assert.equal(vehicleIdFromTitle('Toyota Corolla'), null)
  assert.equal(vehicleIdFromTitle('Toyota Prius'), null)
})

test('listings with no price are dropped, then ranked by budget, payment, and mileage', () => {
  const rows: PricedRow[] = [
    { title: 'Far RAV4', price: 20000, mileage: 50000, source: 'Far Lot', link: 'https://example.com/far' },
    { title: 'Close RAV4', price: 20000, mileage: 34000, source: 'Near Lot', link: 'https://example.com/near' },
    { title: 'Pricey RAV4', price: 40000, mileage: 34200, source: 'High Lot', link: 'https://example.com/high' },
    { title: 'No price', price: 0, mileage: 34000, source: 'Empty', link: 'https://example.com/empty' },
  ]
  const ranked = rankListings(rows, mayaOffer, 520, 34200)
  assert.deepEqual(ranked.map((item) => item.title), ['Close RAV4', 'Far RAV4', 'Pricey RAV4'])
  assert.equal(ranked[0].vehicleId, 'suv')
  assert.ok(ranked[0].monthlyCents <= 52000)
  assert.ok(ranked[2].monthlyCents > 52000)
})

test('a mileage-filtered median inside the band is the market value', () => {
  const rows: PricedRow[] = [
    { title: '2023 Toyota RAV4 Hybrid XLE', price: 27000, mileage: 34200, source: 'A', link: 'https://example.com/a' },
    { title: '2023 Toyota RAV4 Hybrid XLE', price: 28000, mileage: 36000, source: 'B', link: 'https://example.com/b' },
    { title: '2023 Toyota RAV4 Hybrid XLE', price: 10000, mileage: 90000, source: 'C', link: 'https://example.com/c' },
    { title: '2021 Toyota Camry SE', price: 15000, mileage: 34000, source: 'D', link: 'https://example.com/d' },
  ]
  const snapshot = assembleSnapshot({
    zip: '78701',
    customerId: 'maya',
    odometer: 34200,
    anchor: 28900,
    offer: mayaOffer,
    budget: 520,
    rows,
    dealer: null,
    serviceShop: null,
    fetchedAt: Date.UTC(2026, 9, 24, 18, 41),
  })
  assert.equal(snapshot.comps.length, 2)
  assert.equal(snapshot.marketValue, 27500)
  assert.equal(snapshot.sample, 'accepted')
  assert.match(marketNote(snapshot) ?? '', /Market value \$27,500, median of 2 listings within 8,000 miles, Google Shopping, \d{1,2}:\d{2}[ap]m\./)
})

test('a median outside 40 to 160 percent of the anchor is rejected', () => {
  const judged = judgeMedian([5000, 6000, 7000], 28900)
  assert.equal(judged.marketValue, null)
  assert.equal(judged.sample, 'rejected')
  assert.equal(
    marketNote({ marketValue: null, comps: [], sample: 'rejected', fetchedAt: 0 }),
    'The shopping sample was rejected, so the contract value stays in place.',
  )
})

test('toy rows and prices under $1,500 are not cars', () => {
  assert.equal(plausibleVehicle({ title: 'Matchbox Toyota RAV4', price: 5, mileage: null, source: 'Store', link: '' }), false)
  assert.equal(plausibleVehicle({ title: 'Used 2020 Toyota RAV4', price: 240, mileage: 18000, source: 'Lot', link: '' }), false)
  assert.equal(plausibleVehicle({ title: '2023 Toyota RAV4 Hybrid XLE', price: 27400, mileage: 34200, source: 'Lot', link: '' }), true)
})

test('shopping rows without an extracted price never become listings', () => {
  const rows = readShopping([
    { title: '2023 Toyota RAV4 Hybrid XLE', source: 'Austin Toyota', link: 'https://example.com/rav', extensions: ['34,200 mi'] },
    { title: '2023 Toyota RAV4 Hybrid XLE', extracted_price: 27400, source: 'Austin Toyota', product_link: 'https://example.com/priced', extensions: ['34,200 mi'] },
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].price, 27400)
  assert.equal(rows[0].mileage, 34200)
  assert.equal(rows[0].link, 'https://example.com/priced')
})

test('desk copy uses the maps place, and the queries stay fixed', () => {
  const place: Place = {
    name: 'Toyota of Austin',
    rating: 4.6,
    hours: hoursLine('Open · Closes 7 PM'),
    address: '123 Main',
    phone: '512-555-0100',
    lat: 30.27,
    lng: -97.74,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=30.27,-97.74',
  }
  assert.equal(place.hours, 'open until 7')
  assert.equal(hoursLine('Closed'), 'closed')
  assert.equal(hoursLine('9 AM–7 PM'), 'open until 7')
  assert.equal(deskLabel('Dealer', place), 'Toyota of Austin · 4.6 · open until 7')
  assert.equal(deskLabel('Dealer', null), 'Dealer')
  assert.equal(ownCarQuery('maya'), '2023 Toyota RAV4 Hybrid XLE')
  assert.equal(ownCarQuery('jordan'), '2021 Toyota Camry SE')
  assert.equal(inventoryQuery('suv'), 'Toyota SUV')
  assert.equal(sameCar('2023 Toyota RAV4 Hybrid', 'maya'), true)
  assert.equal(sameCar('2021 Toyota Camry SE', 'maya'), false)
  assert.equal(confirmQuestion('Austin Toyota'), 'Confirm with Austin Toyota whether the advertised price includes fees.')
})
