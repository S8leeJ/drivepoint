import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseQuote, quoteGaps } from './quote.ts'

test('a pasted quote separates price, fees, options, and leaves unknown lines', () => {
  const parsed = parseQuote(`
    Selling price: $28,990
    Doc fee $499
    GAP protection 895
    Rate 6.9%
    Term 72 months
    Mystery coating included
  `)
  assert.equal(parsed.price, 28990)
  assert.equal(parsed.fees, 499)
  assert.equal(parsed.options, 895)
  assert.equal(parsed.rate, 6.9)
  assert.equal(parsed.term, 72)
  assert.deepEqual(parsed.unknown, ['Mystery coating included'])
  assert.ok(quoteGaps(parsed).some((gap) => gap.includes('Mystery coating')))
})
