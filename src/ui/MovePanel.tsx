import { openFeature, openOverlay } from '../experience/session.ts'
import { CUSTOMERS, customerById } from '../finance/customers.ts'
import { loadCustomer, restoreOffer, useDecision, useJourney } from '../finance/journey.ts'
import { formatMoney } from '../finance/loan.ts'
import { followNext, openStagedCompare } from './actions.ts'
import type { MoneyPath } from '../finance/decide.ts'

function optionMoney(path: MoneyPath) {
  if (path.id === 'keep' && !path.sameCar) return `${formatMoney(path.totalCents)} to return`
  if (path.cadence === 'once') return formatMoney(path.displayCents)
  return `${formatMoney(path.displayCents)} / month`
}

export function MovePanel() {
  const decision = useDecision()
  const { customerId, noted } = useJourney()
  const next = decision.next
  const notedThis = noted && decision.ctaTarget === 'note'
  const person = customerId ? customerById(customerId) : null
  const paymentOverBudget = next.cadence === 'month' && next.displayCents > decision.budgetCents

  return (
    <aside className="feature-panel home-sheet" aria-label="My next move">
      <p className="eyebrow">Your next move</p>
      {person && (
        <details className="profile-disclosure">
          <summary>{person.name} · {person.vehicle} · {person.contract}</summary>
          <p className="fine">Try another example:</p>
          <div className="choice-row" role="group" aria-label="Example situation">
            {CUSTOMERS.map((option) => (
              <button key={option.id} type="button" className={option.id === customerId ? 'customer on' : 'customer'} onClick={() => loadCustomer(option.id)}>
                {option.contract === 'lease' ? 'Lease ending' : 'Loan in progress'}
              </button>
            ))}
          </div>
        </details>
      )}
      <div className="answer-hero">
        <p className="eyebrow">{paymentOverBudget ? 'No monthly option fits this budget' : 'Recommended for this example'}</p>
        <h2>{next.title}</h2>
        <p className="payment" aria-live="polite">
          {formatMoney(next.displayCents)}
          <span>{next.cadence === 'month' ? '/ month' : ' one time'}</span>
        </p>
        <p className="answer-context">For {person ? `${person.name}’s ${person.contract}` : 'this example'}, with a {formatMoney(decision.budgetCents)} monthly budget.</p>
        {paymentOverBudget && <p className="budget-alert">This payment is {formatMoney(next.displayCents - decision.budgetCents)} over budget. Review other options before choosing.</p>}
        {!paymentOverBudget && decision.overBudget && <p className="budget-alert">With ownership costs, this is above budget. Review the costs before deciding.</p>}
      </div>
      <button type="button" className="cta" disabled={notedThis} onClick={() => followNext(decision)}>
        {notedThis ? 'Saved for this session' : paymentOverBudget ? 'Review this offer' : decision.cta} <span aria-hidden="true">→</span>
      </button>
      <button type="button" className="quiet-action" onClick={() => openOverlay('plan')}>Change my budget or details</button>

      <details className="progressive-detail">
        <summary>Why this move?</summary>
        <p>{next.line}</p>
        {decision.changed && <p className="note strong">{decision.changed}</p>}
        {decision.overBudget && <p>Including insurance, fuel, and upkeep: {formatMoney(decision.fullMonthlyCents)} a month.</p>}
        {next.cadence === 'month' && <p>Total on this path: {formatMoney(next.totalCents)}.</p>}
        <button type="button" className="ghost" onClick={() => openOverlay('assist')}>Explain the trade-offs</button>
        <details>
          <summary>What should I confirm?</summary>
          <ul>
            {decision.assumptions.map((item) => <li key={item}>{item}</li>)}
            {decision.questions.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <button type="button" className="ghost" onClick={restoreOffer}>Reset to the starting offer</button>
        </details>
      </details>

      <details className="progressive-detail">
        <summary>See other options</summary>
        <ul className="path-list">
          {decision.alternatives.map((path) => (
            <li key={path.id}><strong>{path.title}</strong><span>{optionMoney(path)}</span></li>
          ))}
        </ul>
        <button type="button" className="ghost" onClick={openStagedCompare}>Compare two offers</button>
      </details>

      <details className="progressive-detail">
        <summary>More tools</summary>
        <div className="panel-actions">
          <button type="button" className="ghost" onClick={() => openOverlay('visit')}>Prepare a visit</button>
          <button type="button" className="ghost" onClick={() => openFeature('timeline')}>
            Month by month
          </button>
          <button type="button" className="ghost" onClick={() => openFeature('market')}>
            Cars near this budget
          </button>
          <button type="button" className="ghost" onClick={() => openOverlay('garage')}>
            Saved scenarios
          </button>
          <button type="button" className="ghost" onClick={() => openOverlay('business')}>
            How this session went
          </button>
        </div>
      </details>
      <p className="fine answer-disclaimer">Illustrative figures, not a credit offer.</p>
    </aside>
  )
}
