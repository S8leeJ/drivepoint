import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LeaseTerms } from './decide.ts'
import type { LoanInputs } from './loan.ts'
import { compareHorizon, equityAdjustment } from './plan.ts'

const offer: LoanInputs = {
  price: 12000,
  downPayment: 0,
  annualRate: 0,
  termMonths: 12,
  taxRate: 0,
  fees: 0,
  rollExtras: false,
}

const lease: LeaseTerms = {
  payment: 400,
  months: 12,
  allowance: 12000,
  perMile: 0.2,
  disposition: 300,
  residual: 8000,
  dueAtSigning: 400,
}

test('positive equity increases the down payment and negative equity increases the price', () => {
  assert.deepEqual(equityAdjustment(20000, 1000, 2500), { price: 20000, downPayment: 3500, equity: 2500 })
  assert.deepEqual(equityAdjustment(20000, 1000, -800), { price: 20800, downPayment: 1000, equity: -800 })
})

test('a zero-interest loan and a lease can be compared on one horizon', () => {
  const view = compareHorizon(offer, lease, 12, 12000)
  assert.equal(view.financePaidCents, 1_200_000)
  assert.equal(view.financeBalanceCents, 0)
  assert.equal(view.estimatedValueCents, 1_020_000)
  assert.equal(view.leaseMileageCents, 0)
  assert.equal(view.leaseDispositionCents, 30000)
  assert.equal(view.leasePaidCents, 40000 + 40000 * 12 + 30000)
})
