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
      <p className="fine">No provider is connected. A request stays in this session, with a clear success or a simulated failure. It is not sent to a dealer.</p>
      <button type="button" className="ghost" onClick={fill}>
        Fill from the next move
      </button>
      <label className="field">
        <span>Summary</span>
        <textarea className="quote-box" aria-label="Visit summary" value={journey.visitSummary} onChange={(event) => setVisitDraft(event.target.value, journey.visitQuestions)} />
      </label>
      <label className="field">
        <span>Open questions</span>
        <textarea className="quote-box" aria-label="Open questions" value={journey.visitQuestions} onChange={(event) => setVisitDraft(journey.visitSummary, event.target.value)} />
      </label>
      <p className="eyebrow">Readiness · {done} of {CHECKLIST.length}</p>
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
        <button type="button" className="cta" onClick={() => window.print()}>
          Export my comparison
        </button>
      </div>
      {journey.visitStatus === 'sent' && <p className="note strong">Stored on this device as a {journey.requestKind} request. Nothing left the browser.</p>}
      {journey.visitStatus === 'failed' && <p className="note">The local demo failed the {journey.requestKind} request on purpose. Change the failure switch and try again.</p>}
      {journey.visitStatus === 'prepared' && <p className="fine">The summary is ready. Edit it, then choose a local request.</p>}
    </aside>
  )
}
