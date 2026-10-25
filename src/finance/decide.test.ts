import assert from 'node:assert/strict'
import { test } from 'node:test'
import { customerById } from './customers.ts'
import { baselineInput, decide, monthlyEnergy, savingsDown, type DecisionInput } from './decide.ts'

function edit(input: DecisionInput, offer: Partial<DecisionInput['offer']> = {}, rest: Partial<DecisionInput> = {}): DecisionInput {
  return {
    ...input,
    ...rest,
    offer: { ...input.offer, ...offer },
    preferences: rest.preferences ?? input.preferences,
    ownership: rest.ownership ?? input.ownership,
    lease: rest.lease ?? input.lease,
    trade: rest.trade ?? input.trade,
  }
}

test('Maya starts on the dealer buyout', () => {
  const decision = decide(baselineInput(customerById('maya')))
  assert.equal(decision.next.id, 'buyout')
  assert.equal(decision.winnerStop, 'dealer')
  assert.equal(decision.changed, null)
  assert.equal(decision.ctaTarget, 'financing')
  assert.ok(decision.next.monthlyCents < 52000)
  assert.ok(decision.next.equityCents > 0)
})

test('a buyout rate above the budget sends Maya back to turn-in', () => {
  const decision = decide(edit(baselineInput(customerById('maya')), { annualRate: 12 }))
  assert.equal(decision.next.id, 'keep')
  assert.equal(decision.winnerStop, 'home')
  assert.match(decision.changed ?? '', /Buy out/)
  assert.match(decision.changed ?? '', /12\.0%/)
})

test('when no monthly path fits, the explanation does not claim the payment fits', () => {
  const input = baselineInput(customerById('maya'))
  const decision = decide(edit(input, {}, {
    preferences: { ...input.preferences, budget: 400 },
  }))
  assert.ok(decision.next.monthlyCents > decision.budgetCents)
  assert.match(decision.reason, /No compared monthly option meets the budget/)
  assert.doesNotMatch(decision.reason, /buyout payment fits/)
})

test('a buyout priced above the car value is not the next step', () => {
  const decision = decide(edit(baselineInput(customerById('maya')), { price: 30000 }))
  assert.equal(decision.next.id, 'keep')
  assert.match(decision.stops.dealer.because, /market value/)
})

test('extra miles raise the cost of turning the lease in', () => {
  const maya = customerById('maya')
  const base = decide(baselineInput(maya))
  const more = edit(baselineInput(maya), {}, {
    preferences: { ...baselineInput(maya).preferences, annualMiles: 20000 },
  })
  const decision = decide(more)
  assert.equal(decision.next.id, 'buyout')
  assert.ok(decision.stops.home.totalCents > base.stops.home.totalCents)
})

test('Jordan starts on the service visit', () => {
  const decision = decide(baselineInput(customerById('jordan')))
  assert.equal(decision.next.id, 'service')
  assert.equal(decision.winnerStop, 'service')
  assert.equal(decision.changed, null)
  assert.equal(decision.ctaTarget, 'note')
  assert.equal(decision.ownershipChoice.id, 'keep')
})

test('a cheaper refinance becomes Jordan’s next step', () => {
  const decision = decide(edit(baselineInput(customerById('jordan')), { annualRate: 0, termMonths: 31 }))
  assert.equal(decision.next.id, 'refinance')
  assert.equal(decision.winnerStop, 'dealer')
  assert.match(decision.changed ?? '', /service/i)
})

test('asking for the lowest payment prefers Jordan’s refinance even when the total is higher', () => {
  const input = baselineInput(customerById('jordan'))
  const decision = decide(edit(input, {}, {
    preferences: { ...input.preferences, priority: 'payment' },
  }))
  assert.equal(decision.next.id, 'refinance')
  assert.match(decision.changed ?? '', /lowest monthly payment/)
})

test('ownership costs warn without hiding the buyout', () => {
  const input = baselineInput(customerById('maya'))
  const decision = decide(edit(input, {}, {
    ownership: { insurance: 200, fuel: 0, maintenance: 0, other: 0 },
  }))
  assert.equal(decision.next.id, 'buyout')
  assert.equal(decision.overBudget, true)
  assert.match(decision.changed ?? '', /over budget/)
})

test('a market median under the buyout drops Maya’s buyout', () => {
  const note = 'Market value $25,000, median of 9 listings within 8,000 miles, Google Shopping, 6:41pm.'
  const input = edit(baselineInput(customerById('maya')), {}, {
    market: { value: 25000, note },
  })
  const decision = decide(input)
  assert.equal(decision.next.id, 'keep')
  assert.match(decision.assumptions.join('\n'), /Market value \$25,000, median of 9 listings within 8,000 miles/)
  assert.match(decision.changed ?? '', /Buy out/)
  assert.match(decision.changed ?? '', /\$25,000/)
})

test('a market median above the buyout keeps Maya’s buyout', () => {
  const note = 'Market value $27,400, median of 4 listings within 8,000 miles, Google Shopping, 6:41pm.'
  const decision = decide(edit(baselineInput(customerById('maya')), {}, {
    market: { value: 27400, note },
  }))
  assert.equal(decision.next.id, 'buyout')
  assert.ok(decision.next.equityCents > 0)
  assert.match(decision.assumptions.join('\n'), /Market value \$27,400, median of 4 listings/)
})

test('energy and savings helpers stay non-negative', () => {
  assert.ok(monthlyEnergy(12000, 30, 3.5) > 0)
  assert.equal(monthlyEnergy(12000, 0, 3.5), 0)
  assert.equal(savingsDown(200, 12), 2400)
  assert.equal(savingsDown(-5, 12), 0)
})
