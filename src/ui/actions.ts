import { openOverlay, requestFeature } from '../experience/session.ts'
import type { Decision } from '../finance/decide.ts'
import { noteNextStep, prepareVisit, presentPath, recordEvent, stageCompare } from '../finance/journey.ts'

export function followNext(decision: Decision) {
  if (decision.ctaTarget === 'financing') {
    presentPath(decision.next.id)
    recordEvent('Opened the next step', decision.next.title)
    requestFeature('financing')
    return
  }
  noteNextStep(decision.next.title)
  prepareVisit(`${decision.next.title}. ${decision.reason}`, decision.questions.join('\n'))
  openOverlay('visit')
}

export function openStagedCompare() {
  stageCompare()
  recordEvent('Staged a comparison', 'Current contract and the open offer')
  requestFeature('compare')
}
