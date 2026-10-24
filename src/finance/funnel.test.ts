import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFunnel } from './funnel.ts'

test('the funnel moves from looking, to editing, to saving, to a prepared visit', () => {
  assert.deepEqual(readFunnel(0, 0, 'idle', false), { explored: false, shaped: false, saved: false, prepared: false })
  assert.deepEqual(readFunnel(2, 0, 'idle', true), { explored: true, shaped: true, saved: false, prepared: false })
  assert.equal(readFunnel(2, 1, 'prepared', true).saved, true)
  assert.equal(readFunnel(2, 1, 'failed', true).prepared, false)
  assert.equal(readFunnel(2, 1, 'sent', true).prepared, true)
})
