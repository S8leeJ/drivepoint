import assert from 'node:assert/strict'
import { test } from 'node:test'
import { customerById } from './customers.ts'
import { baselineInput, decide, type DecisionInput } from './decide.ts'
import { answerQuestion } from './explain.ts'

function edit(input: DecisionInput, rest: Partial<DecisionInput> = {}): DecisionInput {
  return {
    ...input,
    ...rest,
    offer: input.offer,
    preferences: rest.preferences ?? input.preferences,
    ownership: rest.ownership ?? input.ownership,
    lease: rest.lease ?? input.lease,
    trade: rest.trade ?? input.trade,
  }
}

test('why uses the decision, and interest offers to highlight it', () => {
  const decision = decide(baselineInput(customerById('maya')))
  const why = answerQuestion('Why is this the next step?', decision)
  assert.match(why.text, /buyout/i)
  assert.equal(why.action, 'move')
  const interest = answerQuestion('How much is interest?', decision)
  assert.equal(interest.action, 'interest')
  assert.match(interest.text, /not an APR/)
})

test('why answers from the market sentence when a listing median is on file', () => {
  const note = 'Market value $25,000, median of 9 listings within 8,000 miles, Google Shopping, 6:41pm.'
  const decision = decide(edit(baselineInput(customerById('maya')), {
    market: { value: 25000, note },
  }))
  const why = answerQuestion('Why is this the next step?', decision)
  assert.match(why.text, /median of 9 listings within 8,000 miles/)
  assert.match(why.text, /Google Shopping/)
})

test('an unrelated question does not invent a new number', () => {
  const decision = decide(baselineInput(customerById('jordan')))
  const answer = answerQuestion('What is the weather in Austin?', decision)
  assert.match(answer.text, /numbers already on screen/)
  assert.match(answer.text, /service/i)
})

test('budget answer flags a payment above the entered budget', () => {
  const input = baselineInput(customerById('maya'))
  const decision = decide(edit(input, {
    preferences: { ...input.preferences, budget: 400 },
  }))
  const answer = answerQuestion('Does this fit the budget?', decision)
  assert.match(answer.text, /above the \$400 budget/)
  assert.doesNotMatch(answer.text, /payment fits/)
})
