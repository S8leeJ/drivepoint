import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildLoan, compareTradeoff, scheduleRow, type LoanInputs } from './loan.ts'

function loan(overrides: Partial<LoanInputs> = {}): LoanInputs {
  return {
    price: 10000,
    downPayment: 0,
    annualRate: 0,
    termMonths: 12,
    taxRate: 0,
    fees: 0,
    rollExtras: false,
    ...overrides,
  }
}

test('zero interest divides the amount financed evenly', () => {
  const quote = buildLoan(loan({ price: 12000, termMonths: 12 }))
  assert.equal(quote.financedCents, 1_200_000)
  assert.equal(quote.monthlyCents, 100_000)
  assert.equal(quote.totalInterestCents, 0)
  assert.equal(quote.totalPaymentsCents, 1_200_000)
  assert.equal(quote.schedule.length, 13)
  assert.equal(quote.schedule[0].balanceCents, 1_200_000)
  assert.equal(quote.schedule[12].balanceCents, 0)
  assert.equal(quote.schedule.every((row) => row.interestCents === 0), true)
})

test('zero interest puts the remainder on the last payment', () => {
  const quote = buildLoan(loan({ price: 10000, termMonths: 3 }))
  assert.equal(quote.monthlyCents, 333_333)
  assert.equal(quote.schedule[1].principalCents, 333_333)
  assert.equal(quote.schedule[2].principalCents, 333_333)
  assert.equal(quote.schedule[3].principalCents, 333_334)
  assert.equal(quote.schedule[3].balanceCents, 0)
  const principal = quote.schedule.reduce((sum, row) => sum + row.principalCents, 0)
  assert.equal(principal, quote.financedCents)
})

test('positive interest amortizes to zero and conserves principal', () => {
  const quote = buildLoan(loan({ price: 10000, annualRate: 6, termMonths: 12 }))
  assert.equal(quote.monthlyCents, 86_066)
  assert.equal(quote.schedule.at(-1)?.balanceCents, 0)
  const principal = quote.schedule.reduce((sum, row) => sum + row.principalCents, 0)
  const interest = quote.schedule.reduce((sum, row) => sum + row.interestCents, 0)
  assert.equal(principal, quote.financedCents)
  assert.equal(interest, quote.totalInterestCents)
  assert.equal(quote.totalPaymentsCents, quote.financedCents + quote.totalInterestCents)
  assert.ok(quote.totalInterestCents > 0)
  assert.equal(quote.explanation.includes('APR'), true)
  assert.equal(quote.explanation.includes('not an APR'), true)
})

test('a one-month loan charges one interest accrual', () => {
  const quote = buildLoan(loan({ price: 1000, annualRate: 12, termMonths: 1 }))
  assert.equal(quote.schedule.length, 2)
  assert.equal(quote.schedule[1].interestCents, 1_000)
  assert.equal(quote.schedule[1].principalCents, 100_000)
  assert.equal(quote.schedule[1].balanceCents, 0)
})

test('taxes and fees stay upfront unless they are rolled in', () => {
  const upfront = buildLoan(loan({ price: 20000, downPayment: 2000, taxRate: 6.25, fees: 499, termMonths: 60, annualRate: 5.9 }))
  assert.equal(upfront.taxCents, 125_000)
  assert.equal(upfront.feesCents, 49_900)
  assert.equal(upfront.financedCents, 1_800_000)
  assert.equal(upfront.upfrontCents, 200_000 + 125_000 + 49_900)
  assert.match(upfront.explanation, /not part of the amount financed/)

  const rolled = buildLoan(loan({
    price: 20000,
    downPayment: 2000,
    taxRate: 6.25,
    fees: 499,
    termMonths: 60,
    annualRate: 5.9,
    rollExtras: true,
  }))
  assert.equal(rolled.financedCents, 1_800_000 + 125_000 + 49_900)
  assert.equal(rolled.upfrontCents, 200_000)
  assert.match(rolled.explanation, /plus taxes and fees/)
})

test('down payment above the cap finances nothing', () => {
  const quote = buildLoan(loan({ price: 10000, downPayment: 15000, taxRate: 5, fees: 100 }))
  assert.equal(quote.downWasCapped, true)
  assert.equal(quote.financedCents, 0)
  assert.equal(quote.monthlyCents, 0)
  assert.equal(quote.upfrontCents, 1_000_000 + 50_000 + 10_000)
  assert.equal(quote.schedule.length, 13)
  assert.equal(scheduleRow(quote, 6).balanceCents, 0)
})

test('invalid values become a safe zero quote', () => {
  const quote = buildLoan({
    price: Number.NaN,
    downPayment: -20,
    annualRate: Number.POSITIVE_INFINITY,
    termMonths: 0,
    taxRate: -1,
    fees: Number.NaN,
    rollExtras: false,
  })
  assert.deepEqual(quote.issues.sort(), ['annualRate', 'downPayment', 'fees', 'price', 'taxRate', 'term'])
  assert.equal(quote.financedCents, 0)
  assert.equal(quote.monthlyCents, 0)
  assert.equal(quote.totalInterestCents, 0)
  assert.equal(quote.schedule.length, 1)
})

test('the same inputs always produce the same schedule', () => {
  const first = buildLoan(loan({ annualRate: 4.9, termMonths: 48, downPayment: 2500, taxRate: 6.25, fees: 350 }))
  const second = buildLoan(loan({ annualRate: 4.9, termMonths: 48, downPayment: 2500, taxRate: 6.25, fees: 350 }))
  assert.deepEqual(first, second)
})

test('scrubbing a month reads that row only', () => {
  const quote = buildLoan(loan({ price: 12000, annualRate: 0, termMonths: 12 }))
  const month = scheduleRow(quote, 5)
  assert.equal(month.month, 5)
  assert.equal(month.principalPaidCents, 500_000)
  assert.equal(month.balanceCents, 700_000)
  assert.equal(scheduleRow(quote, -4).month, 0)
  assert.equal(scheduleRow(quote, 99).month, 12)
})

test('tradeoff names the higher monthly payment and interest', () => {
  const shorter = buildLoan(loan({ price: 15000, annualRate: 6, termMonths: 24, downPayment: 3000 }))
  const longer = buildLoan(loan({ price: 15000, annualRate: 6, termMonths: 72, downPayment: 1000 }))
  const text = compareTradeoff(shorter, longer, true)
  assert.match(text, /same vehicle/)
  assert.match(text, /Scenario B is .+ more per month|Scenario A is .+ more per month/)
  assert.match(text, /interest/)
})
