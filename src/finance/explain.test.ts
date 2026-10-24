import assert from 'node:assert/strict'
import { test } from 'node:test'
import { customerById } from './customers.ts'
import { baselineInput, decide } from './decide.ts'
import { answerQuestion } from './explain.ts'

test('why uses the decision, and interest offers to highlight it', () => {
  const decision = decide(baselineInput(customerById('maya')))
  const why = answerQuestion('Why is this the next step?', decision)
  assert.match(why.text, /buyout/i)
  assert.equal(why.action, 'move')
  const interest = answerQuestion('How much is interest?', decision)
  assert.equal(interest.action, 'interest')
  assert.match(interest.text, /not an APR/)
})

test('an unrelated question does not invent a new number', () => {
  const decision = decide(baselineInput(customerById('jordan')))
  const answer = answerQuestion('What is the weather in Austin?', decision)
  assert.match(answer.text, /numbers already on screen/)
  assert.match(answer.text, /service/i)
})
