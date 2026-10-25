import { useState } from 'react'
import { AnswerLink } from './AnswerLink.tsx'
import { CHECKLIST, prepareVisit, setVisitDraft, submitRequest, toggleCheck, useDecision, useJourney, type RequestKind } from '../finance/journey.ts'

const REQUESTS: { id: RequestKind; label: string }[] = [
  { id: 'test-drive', label: 'Request a test drive' },
  { id: 'appraisal', label: 'Request an appraisal' },
  { id: 'financing', label: 'Request a financing look' },
  { id: 'service', label: 'Request the service visit' },
]

export function VisitPanel() {
  const decision = useDecision()
  const journey = useJourney()
  const [fail, setFail] = useState(false)
  const done = CHECKLIST.filter(([id]) => journey.checks[id]).length
  const fill = () => {
    prepareVisit(
      `${decision.next.title}. ${decision.reason}`,
      decision.questions.join('\n'),
    )
  }

  return (
    <aside className="feature-panel" aria-label="Prepare a visit">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Visit</p>
          <h2>Prepare my visit</h2>
        </div>
        <AnswerLink />
      </div>
      <p className="fine">Take a short summary and your questions to a dealer or service visit.</p>
      <button type="button" className="cta" onClick={fill}>Use my recommended move →</button>
      {journey.visitStatus === 'prepared' && <p className="note strong">Your visit summary is ready.</p>}
      <details className="progressive-detail">
        <summary>Review and edit my notes</summary>
      <label className="field">
        <span>Summary</span>
        <textarea className="quote-box" aria-label="Visit summary" value={journey.visitSummary} onChange={(event) => setVisitDraft(event.target.value, journey.visitQuestions)} />
      </label>
      <label className="field">
        <span>Open questions</span>
        <textarea className="quote-box" aria-label="Open questions" value={journey.visitQuestions} onChange={(event) => setVisitDraft(journey.visitSummary, event.target.value)} />
      </label>
      </details>
      <details className="progressive-detail">
        <summary>What to bring · {done} of {CHECKLIST.length} ready</summary>
      <ul className="path-list">
        {CHECKLIST.map(([id, label]) => (
          <li key={id}>
            <label className="check">
              <input type="checkbox" checked={Boolean(journey.checks[id])} onChange={() => toggleCheck(id)} />
              {label}
            </label>
          </li>
        ))}
      </ul>
      </details>
      <details className="progressive-detail">
        <summary>Save a practice request</summary>
        <p className="fine">Demo only. Nothing is sent to a dealer.</p>
      <label className="check">
        <input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} />
        Simulate a failed response
      </label>
      <div className="panel-actions">
        {REQUESTS.map((request) => (
          <button key={request.id} type="button" className="ghost" onClick={() => submitRequest(request.id, fail)}>
            {request.label}
          </button>
        ))}
      </div>
      </details>
      <button type="button" className="quiet-action" onClick={() => window.print()}>Print or save this plan</button>
      {journey.visitStatus === 'sent' && <p className="note strong">Stored on this device as a {journey.requestKind} request. Nothing left the browser.</p>}
      {journey.visitStatus === 'failed' && <p className="note">The local demo failed the {journey.requestKind} request on purpose. Change the failure switch and try again.</p>}
    </aside>
  )
}
