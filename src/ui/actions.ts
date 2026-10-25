import { openFeature, openOverlay } from '../experience/session.ts'
import type { Decision } from '../finance/decide.ts'
import { getJourney, noteNextStep, prepareVisit, presentPath, recordEvent, stageCompare } from '../finance/journey.ts'

export function followNext(decision: Decision) {
  if (decision.ctaTarget === 'financing') {
    presentPath(decision.next.id)
    recordEvent('Opened the next step', decision.next.title)
    openFeature('financing')
    return
  }
  if (!getJourney().noted) {
    noteNextStep(decision.next.title)
    prepareVisit(`${decision.next.title}. ${decision.next.line}`, decision.questions.join('\n'))
  }
  openOverlay('visit')
}

export function openStagedCompare() {
  stageCompare()
  recordEvent('Staged a comparison', 'Current contract and the open offer')
  openFeature('compare')
}
