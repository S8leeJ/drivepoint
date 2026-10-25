import { backToDrive, openFeature, openOverlay } from '../experience/session.ts'
import { CUSTOMERS, customerById } from '../finance/customers.ts'
import { ratePercent } from '../finance/decide.ts'
import { loadCustomer, restoreOffer, useDecision, useJourney } from '../finance/journey.ts'
import { formatMoney } from '../finance/loan.ts'
import { followNext, openStagedCompare } from './actions.ts'
import type { MoneyPath } from '../finance/decide.ts'

function optionMoney(path: MoneyPath) {
  if (path.id === 'keep' && !path.sameCar) return `Costs ${formatMoney(path.totalCents)} to return`
  if (path.cadence === 'once') return formatMoney(path.displayCents)
  return `${formatMoney(path.displayCents)} / month · ${formatMoney(path.totalCents)} total`
}

function situation(id: 'maya' | 'jordan') {
  const person = customerById(id)
  const pay = formatMoney(Math.round(person.payment * 100))
  if (person.contract === 'lease') {
    return `${person.monthsLeft} months left on a ${person.vehicle} lease at ${pay} a month. At this pace the mileage finishes over the allowance. Budget ${formatMoney(Math.round(person.budget * 100))}.`
  }
  return `${person.monthsLeft} months left on a ${person.vehicle} loan at ${pay} a month and ${ratePercent(person.apr)}%. Budget ${formatMoney(Math.round(person.budget * 100))}.`
}

export function MovePanel() {
  const decision = useDecision()
  const { customerId, noted } = useJourney()
  const next = decision.next
  const cadence = next.cadence === 'month' ? '/ month' : 'one time'
  const notedThis = noted && decision.ctaTarget === 'note'
  const person = customerId ? customerById(customerId) : null

  return (
    <aside className="feature-panel home-sheet" aria-label="My next move">
      <div className="panel-head">
        <div className="customers" role="group" aria-label="Contract">
          {CUSTOMERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={option.id === customerId ? 'customer on' : 'customer'}
              onClick={() => loadCustomer(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
        <button type="button" className="text-button" onClick={backToDrive}>
          Drive
        </button>
      </div>
      <p className="eyebrow">My next move</p>
      <h2>{next.title}</h2>
      {person && <p>{situation(person.id)}</p>}
      <p className="payment" aria-live="polite">
        {formatMoney(next.displayCents)}
        <span> {cadence}</span>
      </p>
      {next.cadence === 'month' && <p>Total on this path: {formatMoney(next.totalCents)}.</p>}
      <p>{next.line}</p>
      {decision.changed && <p className="note strong">{decision.changed}</p>}
      {decision.overBudget && (
        <p className="note">
          With insurance, fuel, and upkeep, this is {formatMoney(decision.fullMonthlyCents)} a month, over the {formatMoney(decision.budgetCents)} budget.
        </p>
      )}
      <p className="eyebrow">Other options</p>
      <ul className="path-list">
        {decision.alternatives.map((path) => (
          <li key={path.id}>
            <strong>{path.title}</strong>
            <span>{optionMoney(path)}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="cta" disabled={notedThis} onClick={() => followNext(decision)}>
        {notedThis ? 'Noted for this session' : decision.cta}
      </button>
      {notedThis && <p className="fine">Noted here only. Prepare a visit if you want the next step written down.</p>}
      <div className="panel-actions">
        <button type="button" className="ghost" onClick={() => openOverlay('plan')}>
          Adjust my numbers
        </button>
        <button type="button" className="ghost" onClick={() => openOverlay('assist')}>
          Ask why
        </button>
        <button type="button" className="ghost" onClick={() => openOverlay('visit')}>
          Prepare a visit
        </button>
      </div>
      <details>
        <summary>Assumptions and what to confirm</summary>
        <ul>
          {decision.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {decision.questions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button type="button" className="ghost" onClick={restoreOffer}>
          Reset to the starting offer
        </button>
      </details>
      <details>
        <summary>More</summary>
        <div className="panel-actions">
          <button type="button" className="ghost" onClick={openStagedCompare}>
            Compare two offers
          </button>
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
        {person && <p className="fine">For the store: {person.businessLine}</p>}
      </details>
      <p className="fine">Illustrative figures for this contract. Not a credit offer.</p>
    </aside>
  )
}
