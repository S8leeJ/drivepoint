import { enterAnswer } from '../experience/session.ts'
import { CUSTOMERS, type Customer } from '../finance/customers.ts'
import { ratePercent } from '../finance/decide.ts'
import { loadCustomer } from '../finance/journey.ts'

function blurb(person: Customer) {
  if (person.contract === 'lease') {
    return `${person.vehicle}. ${person.monthsLeft} months left, on pace to finish over the mileage allowance.`
  }
  return `${person.vehicle} at ${ratePercent(person.apr)}%. The ${person.serviceTitle} is close.`
}

export function Entry() {
  return (
    <div className="entry">
      <div className="entry-card">
        <p className="eyebrow">Toyota Financial Services</p>
        <h2>What's your next move?</h2>
        <p>Pick the contract closest to yours. You get one recommended next step, the other options in plain numbers, and a way to change the figures.</p>
        <div className="person-choices">
          {CUSTOMERS.map((person) => (
            <button
              key={person.id}
              type="button"
              className="person"
              onClick={() => {
                loadCustomer(person.id)
                enterAnswer()
              }}
            >
              <em>{person.contract === 'lease' ? 'Lease ending' : 'Loan in progress'}</em>
              <strong>{person.name}</strong>
              <span>{blurb(person)}</span>
            </button>
          ))}
        </div>
        <ol className="steps">
          <li>Read the recommendation and why it won.</li>
          <li>Change the budget, mileage, or the offer if your numbers differ.</li>
          <li>Prepare a visit. Driving the valley is optional.</li>
        </ol>
        <p className="fine">If you drive: W A S D or the arrows, Space to brake, R to reset. These figures are illustrative, not a credit offer.</p>
      </div>
    </div>
  )
}
