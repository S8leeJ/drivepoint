import { openOverlay, requestFeature } from '../experience/session.ts'
import type { Decision } from '../finance/decide.ts'
import { noteNextStep, presentPath, recordEvent, stageCompare } from '../finance/journey.ts'

export function followNext(decision: Decision) {
  if (decision.ctaTarget === 'financing') {
    presentPath(decision.next.id)
    recordEvent('Opened the next step', decision.next.title)
    requestFeature('financing')
    return
  }
  noteNextStep(decision.next.title)
  openOverlay('move')
}

export function openStagedCompare() {
  stageCompare()
  recordEvent('Staged a comparison', 'Current contract and the open offer')
  requestFeature('compare')
}
