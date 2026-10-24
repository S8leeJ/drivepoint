import { closeOverlay, requestFeature } from '../experience/session.ts'
import { restoreOffer, useDecision, useJourney } from '../finance/journey.ts'
import { formatMoney } from '../finance/loan.ts'
import { followNext, openStagedCompare } from './actions.ts'

export function MovePanel() {
  const decision = useDecision()
  const { customerId, noted } = useJourney()
  const next = decision.next
  const cadence = next.cadence === 'month' ? '/ month' : 'one time'
  const notedThis = noted && decision.ctaTarget === 'note'

  return (
    <aside className="feature-panel move-panel" aria-label="My next move">
      <div className="panel-head">
        <div>
          <p className="eyebrow">My next move</p>
          <h2>{next.title}</h2>
        </div>
        <button type="button" className="text-button" onClick={closeOverlay}>
          Back to driving
        </button>
      </div>
      <p className="fine">
        {customerId
          ? 'The car in the valley is a demo stand-in. These figures use the contract on file, and they update when the offer, budget, or mileage changes.'
          : 'Choose Maya Chen or Jordan Hale to load a contract. Until then this is only the open financing offer.'}
      </p>
      <p className="payment" aria-live="polite">
        {formatMoney(next.displayCents)}
        <span> {cadence}</span>
      </p>
      {next.cadence === 'month' && <p>Total on this path: {formatMoney(next.totalCents)}.</p>}
      <p>{decision.reason}</p>
      {decision.changed && <p className="note strong">{decision.changed}</p>}
      {decision.overBudget && (
        <p className="note">
          Finance plus ownership is {formatMoney(decision.fullMonthlyCents)} a month, over the {formatMoney(decision.budgetCents)} budget.
        </p>
      )}
      <dl className="figures">
        {next.figures.map((figure) => (
          <div key={figure.label}>
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>
      <p className="eyebrow">Assumptions</p>
      <ul>
        {decision.assumptions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="eyebrow">Other paths</p>
      <ul className="path-list">
        {decision.alternatives.map((path) => (
          <li key={path.id}>
            <strong>{path.title}</strong>
            <span>
              {path.cadence === 'month' ? `${formatMoney(path.displayCents)} / month` : formatMoney(path.displayCents)}
              {' · '}
              {path.because}
            </span>
          </li>
        ))}
      </ul>
      <p className="eyebrow">Still to confirm</p>
      <ul>
        {decision.questions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="panel-actions">
        <button type="button" className="cta" disabled={notedThis} onClick={() => followNext(decision)}>
          {notedThis ? 'Noted for this session' : decision.cta}
        </button>
        <button type="button" className="ghost" onClick={openStagedCompare}>
          Compare
        </button>
        <button type="button" className="ghost" onClick={() => requestFeature('timeline')}>
          Timeline
        </button>
        <button type="button" className="ghost" onClick={restoreOffer}>
          Starting offer
        </button>
      </div>
      {notedThis && <p className="fine">Noted in this session only. It is not an appointment yet.</p>}
    </aside>
  )
}
