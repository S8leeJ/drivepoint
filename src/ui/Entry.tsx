import { useState } from 'react'
import { enterAnswer } from '../experience/session.ts'
import { CUSTOMERS } from '../finance/customers.ts'
import { loadCustomer } from '../finance/journey.ts'

export function Entry() {
  const [selected, setSelected] = useState(CUSTOMERS[0].id)
  const person = CUSTOMERS.find((customer) => customer.id === selected) ?? CUSTOMERS[0]

  return (
    <div className="entry">
      <div className="entry-card entry-simple">
        <p className="eyebrow">Toyota Financial Services · interactive demo</p>
        <h2>What’s your next move?</h2>
        <p className="entry-lead">See one clear next step for your car and budget.</p>
        <p className="eyebrow">Choose a starting point</p>
        <div className="entry-choices" role="group" aria-label="Example situation">
          {CUSTOMERS.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={selected === customer.id ? 'entry-choice on' : 'entry-choice'}
              aria-pressed={selected === customer.id}
              onClick={() => setSelected(customer.id)}
            >
              <em>{customer.contract === 'lease' ? 'Lease ending' : 'Loan in progress'}</em>
              <strong>{customer.name}</strong>
              <span>{customer.vehicle}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="cta entry-start"
          onClick={() => {
            loadCustomer(person.id)
            enterAnswer()
          }}
        >
          Show my next move <span aria-hidden="true">→</span>
        </button>
        <p className="fine">Sample numbers for {person.name}. You can change them next.</p>
      </div>
    </div>
  )
}
